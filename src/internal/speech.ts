import { computed, getCurrentInstance, inject, onMounted, onScopeDispose, readonly, ref, shallowRef, toValue, watch, type MaybeRefOrGetter } from 'vue'
import { localeContext } from '../rac/locale'
import { useMicrophoneLevels } from './microphone-levels'

interface SpeechResult extends ArrayLike<{ transcript: string }> { isFinal: boolean }
interface SpeechResultEvent { resultIndex: number; results: ArrayLike<SpeechResult> }
export interface SpeechRecognitionError { error: string; message?: string }
interface Recognition {
  lang: string
  continuous: boolean
  interimResults: boolean
  onstart: (() => void) | null
  onend: (() => void) | null
  onspeechstart: (() => void) | null
  onspeechend: (() => void) | null
  onerror: ((event: SpeechRecognitionError) => void) | null
  onresult: ((event: SpeechResultEvent) => void) | null
  start(): void
  stop(): void
  abort(): void
}
type RecognitionConstructor = new () => Recognition
type SpeechWindow = Window & {
  SpeechRecognition?: RecognitionConstructor
  webkitSpeechRecognition?: RecognitionConstructor
  AudioContext?: typeof AudioContext
  webkitAudioContext?: typeof AudioContext
}

export interface SpeechRecognitionOptions {
  locale?: MaybeRefOrGetter<string | undefined>
  lang?: MaybeRefOrGetter<string | undefined>
  continuous?: MaybeRefOrGetter<boolean | undefined>
  interim?: boolean
  interimResults?: MaybeRefOrGetter<boolean | undefined>
  audioContext?: MaybeRefOrGetter<AudioContext | undefined>
  measureAudio?: MaybeRefOrGetter<boolean | undefined>
  transformTranscript?: (text: string) => string
  onTranscript?: (text: string, final: boolean) => void
  onResult?: (text: string) => void
  onError?: (code: string) => void
  onRecognitionError?: (error: SpeechRecognitionError) => void
  onListeningChange?: (listening: boolean) => void
  onStart?: () => void
  onEnd?: () => void
}

export function useSpeechRecognition(options: SpeechRecognitionOptions = {}) {
  const state = ref<'idle' | 'starting' | 'listening' | 'stopping'>('idle')
  const supported = ref(false)
  const listening = ref(false)
  const speaking = ref(false)
  const draft = ref('')
  const error = shallowRef<SpeechRecognitionError>()
  const view = shallowRef<SpeechWindow>()
  const locale = inject(localeContext, null)
  const component = getCurrentInstance()
  const meter = useMicrophoneLevels(computed(() => state.value === 'listening' && toValue(options.measureAudio) !== false), view, options.audioContext)
  let instance: Recognition | undefined
  let recognitionType: RecognitionConstructor | undefined
  let stopRequested = false
  onMounted(() => {
    view.value = component?.proxy?.$el?.ownerDocument?.defaultView ?? globalThis.window
    recognitionType = view.value?.SpeechRecognition ?? view.value?.webkitSpeechRecognition
    supported.value = Boolean(recognitionType)
  })

  function end(notify = true) {
    const wasListening = listening.value
    instance = undefined
    stopRequested = false
    state.value = 'idle'
    listening.value = speaking.value = false
    draft.value = ''
    if (notify && wasListening) {
      options.onListeningChange?.(false)
      options.onEnd?.()
    }
  }
  function fail(reason: SpeechRecognitionError) {
    end()
    error.value = { error: reason.error, message: reason.message }
    options.onError?.(reason.error)
    options.onRecognitionError?.(error.value)
  }
  function stopEngine(recognition: Recognition) {
    try { recognition.stop() }
    catch { fail({ error: 'stop-failed' }) }
  }
  function start() {
    if (state.value !== 'idle' || !recognitionType) return false
    error.value = undefined
    try {
      const recognition = new recognitionType()
      instance = recognition
      recognition.lang = toValue(options.lang) || toValue(options.locale) || locale?.locale.value || view.value?.document.documentElement.lang || ''
      recognition.continuous = toValue(options.continuous) ?? true
      recognition.interimResults = toValue(options.interimResults) ?? options.interim ?? true
      recognition.onstart = () => {
        if (instance !== recognition) return
        const stopAfterStart = stopRequested
        state.value = stopAfterStart ? 'stopping' : 'listening'
        listening.value = true
        options.onListeningChange?.(true)
        options.onStart?.()
        if (stopAfterStart) stopEngine(recognition)
      }
      recognition.onspeechstart = () => { if (instance === recognition) speaking.value = true }
      recognition.onspeechend = () => { if (instance === recognition) speaking.value = false }
      recognition.onresult = event => {
        if (instance !== recognition) return
        let interim = ''
        for (let index = event.resultIndex; index < event.results.length; index++) {
          const result = event.results[index]
          const raw = result[0]?.transcript
          if (!raw) continue
          const text = options.transformTranscript?.(raw) ?? raw
          if (result.isFinal) {
            draft.value = ''
            options.onResult?.(text)
          } else {
            interim += text
            draft.value = interim
          }
          options.onTranscript?.(text, result.isFinal)
        }
      }
      recognition.onerror = event => { if (instance === recognition) fail(event) }
      recognition.onend = () => { if (instance === recognition) end() }
      state.value = 'starting'
      recognition.start()
      return true
    } catch {
      fail({ error: 'start-failed' })
      return false
    }
  }
  function stop() {
    if (!instance || state.value === 'stopping') return
    stopRequested = state.value === 'starting'
    state.value = 'stopping'
    if (!stopRequested) stopEngine(instance)
  }
  function abort(notify = true) {
    const recognition = instance
    end(notify)
    if (!recognition) return
    try { recognition.abort() } catch { /* Its session has already ended. */ }
  }
  function toggle() { if (state.value === 'idle') start(); else stop() }

  onScopeDispose(() => abort(false))
  const isSupported = readonly(supported)
  return { state: readonly(state), supported: isSupported, isSupported, isListening: readonly(listening),
    isSpeaking: readonly(speaking), interimTranscript: readonly(draft), error: readonly(error), ...meter,
    start, stop, abort: () => abort(), toggle }
}

export type SpeechRecognitionControls = ReturnType<typeof useSpeechRecognition>
export interface ChatDictationInput {
  focus(): void
  setInterimText?(text: string): void
  insertText(text: string): void | boolean
}
export interface ChatDictationOptions extends SpeechRecognitionOptions {
  inputRef?: MaybeRefOrGetter<ChatDictationInput | null | undefined>
  hasSounds?: MaybeRefOrGetter<boolean>
}

export function useChatDictation(options: ChatDictationOptions = {}) {
  const committed = ref('')
  const interim = ref('')
  const transcript = computed(() => [committed.value, interim.value].filter(Boolean).join(' '))
  const composer = () => toValue(options.inputRef)
  let privateAudio: AudioContext | undefined
  let peak = 0
  const sharedAudio = () => toValue(options.audioContext) ?? privateAudio
  function cue(starting: boolean) {
    if (!toValue(options.hasSounds)) return
    const context = sharedAudio()
    if (!context || context.state === 'closed') return
    const start = context.currentTime
    const tone = context.createOscillator()
    const gain = context.createGain()
    tone.frequency.setValueAtTime(starting ? 620 : 520, start)
    tone.frequency.exponentialRampToValueAtTime(starting ? 780 : 440, start + .075)
    gain.gain.setValueAtTime(.001, start)
    gain.gain.exponentialRampToValueAtTime(.05, start + .015)
    gain.gain.exponentialRampToValueAtTime(.001, start + .10)
    tone.connect(gain)
    gain.connect(context.destination)
    tone.onended = () => { tone.disconnect(); gain.disconnect() }
    tone.start()
    tone.stop(start + .10)
  }
  const recognition = useSpeechRecognition({
    ...options, audioContext: sharedAudio, onResult: undefined,
    onTranscript(text, final) {
      const value = peak > .84 ? text.toLocaleUpperCase(toValue(options.lang) || toValue(options.locale)) : text
      if (final) {
        committed.value = [committed.value, value.trim()].filter(Boolean).join(' ')
        interim.value = ''
        composer()?.setInterimText?.('')
        composer()?.insertText(value)
        options.onResult?.(value)
        peak = 0
      } else {
        interim.value = value.trim()
        composer()?.setInterimText?.(interim.value)
      }
      options.onTranscript?.(value, final)
    },
    onStart() { cue(true); options.onStart?.() },
    onEnd() {
      cue(false)
      interim.value = ''
      composer()?.setInterimText?.('')
      peak = 0
      options.onEnd?.()
    },
  })
  watch(recognition.volume, level => { peak = Math.max(peak, level) })
  function start() {
    if (!recognition.isSupported.value || recognition.state.value !== 'idle') return false
    if (toValue(options.hasSounds) && !sharedAudio()) {
      const view = globalThis.window as SpeechWindow | undefined
      const Audio = view?.AudioContext ?? view?.webkitAudioContext
      try {
        if (Audio) privateAudio = new Audio()
        if (privateAudio?.state === 'suspended') void privateAudio.resume().catch(() => {})
      } catch { /* Keep dictation available if cues cannot be played. */ }
    }
    composer()?.focus()
    return recognition.start()
  }
  function toggle() { if (recognition.state.value === 'idle') start(); else recognition.stop() }
  function clear() { committed.value = ''; interim.value = ''; composer()?.setInterimText?.('') }
  onScopeDispose(() => {
    composer()?.setInterimText?.('')
    if (privateAudio && privateAudio.state !== 'closed') void privateAudio.close().catch(() => {})
  })
  return { ...recognition, start, toggle, transcript, committed: readonly(committed), interim: readonly(interim), clear }
}
