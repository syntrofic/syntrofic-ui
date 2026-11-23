import { spawn } from 'node:child_process'
import { setTimeout as delay } from 'node:timers/promises'

// A private pipe keeps the screenshot browser independent of installed packages and open Chrome windows.
function chromePipe(executablePath, profile) {
  const child = spawn(executablePath, [
    '--headless', '--remote-debugging-pipe', '--no-first-run', '--no-default-browser-check',
    '--disable-background-networking', '--disable-component-update', '--host-resolver-rules=MAP * ~NOTFOUND',
    '--user-data-dir=' + profile, 'about:blank',
  ], { stdio: ['ignore', 'ignore', 'ignore', 'pipe', 'pipe'], windowsHide: true })
  const input = child.stdio[3]
  const output = child.stdio[4]
  let nextId = 0
  let pending = ''
  let failure
  let shuttingDown
  const requests = new Map()
  function fail(error) {
    failure ??= error
    for (const request of requests.values()) request.reject(failure)
    requests.clear()
  }
  const closed = new Promise(resolve => {
    child.once('close', () => { fail(new Error('Chrome closed during PNG rendering')); resolve() })
  })
  child.on('error', fail)
  input.on('error', fail)
  output.on('error', fail)
  output.setEncoding('utf8').on('data', chunk => {
    const frames = (pending + chunk).split('\0')
    pending = frames.pop()
    for (const frame of frames) {
      if (!frame) continue
      let message
      try { message = JSON.parse(frame) }
      catch (error) { fail(error); return }
      const request = requests.get(message.id)
      if (!request) continue
      requests.delete(message.id)
      if (message.error) request.reject(new Error(message.error.message))
      else request.resolve(message.result)
    }
  })
  function send(method, params = {}, sessionId) {
    if (failure) return Promise.reject(failure)
    return new Promise((resolve, reject) => {
      const id = ++nextId
      requests.set(id, { resolve, reject })
      input.write(JSON.stringify({ id, method, params, sessionId }) + '\0')
    })
  }
  return {
    send,
    async close() {
      if (!shuttingDown) {
        const terminate = setTimeout(() => child.kill(), 1500)
        const force = setTimeout(() => child.kill('SIGKILL'), 3000)
        void send('Browser.close').catch(() => {})
        shuttingDown = closed.finally(() => { clearTimeout(terminate); clearTimeout(force) })
      }
      await shuttingDown
    },
  }
}

export async function openThemeChrome(executablePath, profile, signal) {
  const pipe = chromePipe(executablePath, profile)
  const onAbort = () => { void pipe.close() }
  signal.addEventListener('abort', onAbort, { once: true })
  const close = async () => {
    signal.removeEventListener('abort', onAbort)
    await pipe.close()
  }
  try {
    signal.throwIfAborted()
    const { targetId } = await pipe.send('Target.createTarget', { url: 'about:blank' })
    const { sessionId } = await pipe.send('Target.attachToTarget', { targetId, flatten: true })
    const send = (method, params) => pipe.send(method, params, sessionId)
    await send('Network.enable')
    await send('Network.setBlockedURLs', { urls: ['http://*', 'https://*', 'ws://*', 'wss://*'] })
    await send('Emulation.setDeviceMetricsOverride', { width: 1200, height: 960, deviceScaleFactor: 1, mobile: false })
    const evaluate = async (callback, input) => {
      const { result, exceptionDetails } = await send('Runtime.evaluate', {
        expression: '(' + callback + ')(' + (JSON.stringify(input) ?? 'undefined') + ')', awaitPromise: true, returnByValue: true,
      })
      if (exceptionDetails) throw new Error(exceptionDetails.exception?.description ?? exceptionDetails.text)
      return result.value
    }
    return {
      close,
      evaluate,
      async load(url, mode) {
        await send('Emulation.setEmulatedMedia', {
          features: [{ name: 'prefers-color-scheme', value: mode }, { name: 'prefers-reduced-motion', value: 'reduce' }],
        })
        const { errorText } = await send('Page.navigate', { url })
        if (errorText) throw new Error(errorText)
        const start = Date.now()
        while (Date.now() - start < 10000) {
          signal.throwIfAborted()
          const loaded = await evaluate(href => location.href === href && document.readyState === 'complete', url)
          if (loaded) return
          await delay(40, undefined, { signal })
        }
        throw new Error('The theme page did not finish loading')
      },
      async screenshot(clip) {
        const { data } = await send('Page.captureScreenshot', {
          format: 'png', captureBeyondViewport: true, fromSurface: true, clip: { ...clip, scale: 1 },
        })
        return Buffer.from(data, 'base64')
      },
    }
  } catch (error) {
    await close()
    throw error
  }
}
