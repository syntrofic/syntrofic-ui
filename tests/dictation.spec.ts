import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    class Recognition {
      lang = ''
      continuous = false
      interimResults = false
      onstart?: () => void
      onend?: () => void
      onerror?: (event: { error: string }) => void
      onresult?: (event: unknown) => void
      onspeechstart?: () => void
      start() {
        Object.assign(window, { currentDictation: this })
        queueMicrotask(() => this.onstart?.())
      }
      stop() { document.documentElement.dataset.dictationStop = 'requested' }
      abort() { this.onend?.() }
    }
    class Audio {
      state = 'running'
      createAnalyser() { return { frequencyBinCount: 64, getByteFrequencyData: (values: Uint8Array) => values.fill(85), disconnect() {} } }
      createMediaStreamSource() { return { connect() {}, disconnect() {} } }
      async close() { this.state = 'closed' }
    }
    Object.defineProperty(window, 'SpeechRecognition', { configurable: true, value: Recognition })
    Object.defineProperty(window, 'AudioContext', { configurable: true, value: Audio })
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: async () => ({ getTracks: () => [
      { stop: () => { document.documentElement.dataset.dictationAudioStopped = 'true' } },
    ] }) } })
  })
})

test('composer dictation previews partial text and commits the final phrase after stop', async ({ page }) => {
  await page.goto('/?component=W.chat-dictation-button')
  const example = page.getByRole('region', { name: '在消息编辑器中听写' })
  const editor = example.getByRole('combobox', { name: '听写草稿', exact: true })
  const interim = example.locator('.sy-chat-composer-input__interim')
  const start = example.getByRole('button', { name: '在编辑器中开始听写' })
  await start.click()
  await expect(editor).toBeFocused()
  const settings = await page.evaluate(() => {
    const recognition = (window as unknown as { currentDictation: { lang: string; continuous: boolean; interimResults: boolean } }).currentDictation
    return [recognition.lang, recognition.continuous, recognition.interimResults]
  })
  expect(settings).toEqual(['zh-CN', true, true])
  await page.evaluate(() => {
    const { currentDictation } = window as unknown as { currentDictation: { onresult(event: unknown): void } }
    currentDictation.onresult({ resultIndex: 0, results: [Object.assign([{ transcript: '  正在核对  ' }], { isFinal: false })] })
  })
  await expect(interim).toHaveText('正在核对')
  await expect(editor).toBeEmpty()
  await example.getByRole('button', { name: '在编辑器中停止听写' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-dictation-stop', 'requested')
  await expect(page.locator('html')).toHaveAttribute('data-dictation-audio-stopped', 'true')
  await page.evaluate(() => {
    const { currentDictation } = window as unknown as { currentDictation: { onresult(event: unknown): void; onend(): void } }
    currentDictation.onresult({ resultIndex: 0, results: [Object.assign([{ transcript: '  已核对交付  ' }], { isFinal: true })] })
    currentDictation.onend()
  })
  await expect(editor).toHaveText('已核对交付')
  await expect(example.getByRole('status', { name: '听写结果' })).toHaveText('已核对交付')
  await expect(interim).toHaveCount(0)
  await expect(start).toHaveAttribute('aria-pressed', 'false')
  await example.getByRole('button', { name: '发送听写草稿' }).press('Enter')
  await expect(example.getByRole('status', { name: '听写草稿发送结果' }).locator('.sy-visually-hidden')).toHaveText('已核对交付')
  await expect(editor).toBeEmpty()
})

test('recognition errors clear the interim text and leave the composer ready to restart', async ({ page }) => {
  await page.goto('/?component=W.chat-dictation-button')
  const example = page.getByRole('region', { name: '在消息编辑器中听写' })
  const start = example.getByRole('button', { name: '在编辑器中开始听写' })
  await start.click()
  await page.evaluate(() => {
    const { currentDictation } = window as unknown as { currentDictation: { onresult(event: unknown): void; onerror(event: { error: string }): void } }
    currentDictation.onresult({ resultIndex: 0, results: [Object.assign([{ transcript: '暂时文字' }], { isFinal: false })] })
    currentDictation.onerror({ error: 'not-allowed' })
  })
  await expect(example.getByRole('status', { name: '听写结果' })).toHaveText('not-allowed')
  await expect(example.locator('.sy-chat-composer-input__interim')).toHaveCount(0)
  await expect(start).toBeEnabled()
  await start.click()
  await expect(example.getByRole('button', { name: '在编辑器中停止听写' })).toHaveAttribute('aria-pressed', 'true')
})

test('independent browser speech recognition shows interim and final text without inserting it in the draft', async ({ page }) => {
  await page.goto('/?component=W.chat-composer-input')
  const sample = page.getByRole('region', { name: '独立语音识别' })
  await sample.getByRole('button', { name: '启动语音识别' }).press('Enter')
  const stop = sample.getByRole('button', { name: '暂停语音识别' })
  await expect(stop).toHaveAttribute('aria-pressed', 'true')
  await page.evaluate(() => {
    const { currentDictation } = window as unknown as { currentDictation: { onresult(event: unknown): void } }
    currentDictation.onresult({ resultIndex: 0, results: [Object.assign([{ transcript: '核对中' }], { isFinal: false })] })
  })
  const output = sample.getByRole('status', { name: '语音实时转写' }).locator('.sy-visually-hidden')
  await expect(output).toHaveText('核对中')
  await stop.press('Enter')
  await page.evaluate(() => {
    const { currentDictation } = window as unknown as { currentDictation: { onresult(event: unknown): void; onend(): void } }
    currentDictation.onresult({ resultIndex: 0, results: [Object.assign([{ transcript: '交付已核对' }], { isFinal: true })] })
    currentDictation.onend()
  })
  await expect(output).toHaveText('交付已核对')
  await expect(page.getByRole('combobox', { name: '受控交付草稿' })).toBeEmpty()
})
