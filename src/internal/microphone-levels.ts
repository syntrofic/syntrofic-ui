import { computed, shallowRef, toValue, watch, type MaybeRefOrGetter, type Ref } from 'vue'

const quiet = [.22, .36, .25, .42, .25] as const
const silent = quiet.map(() => 0)
type AudioView = Window & { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }

export function useMicrophoneLevels(active: Readonly<Ref<boolean>>, owner: Readonly<Ref<Window | undefined>>,
  shared?: MaybeRefOrGetter<AudioContext | undefined>,
) {
  const signal = shallowRef<{ bands: readonly number[]; rawBands: readonly number[]; volume: number }>({ bands: quiet, rawBands: silent, volume: 0 })
  watch(() => [active.value, owner.value as AudioView | undefined, toValue(shared)] as const, ([enabled, view, supplied], _, cleanup) => {
    signal.value = { bands: quiet, rawBands: silent, volume: 0 }
    if (!enabled || !view) return
    const media = view.navigator.mediaDevices
    const Audio = view.AudioContext ?? view.webkitAudioContext
    if (!media?.getUserMedia || (!supplied && !Audio)) return
    let cancelled = false
    let frame = 0
    let stream: MediaStream | undefined
    let context: AudioContext | undefined
    let source: MediaStreamAudioSourceNode | undefined
    let analyser: AnalyserNode | undefined

    function release() {
      view?.cancelAnimationFrame(frame)
      source?.disconnect()
      analyser?.disconnect()
      stream?.getTracks().forEach(track => track.stop())
      if (context && context !== supplied && context.state !== 'closed') void context.close().catch(() => {})
      stream = context = source = analyser = undefined
    }

    async function monitor() {
      const microphone = await media.getUserMedia({ audio: true })
      if (cancelled) { microphone.getTracks().forEach(track => track.stop()); return }
      stream = microphone
      context = supplied ?? (Audio ? new Audio() : undefined)
      if (!context) { release(); return }
      analyser = context.createAnalyser()
      analyser.fftSize = 128
      analyser.smoothingTimeConstant = .55
      source = context.createMediaStreamSource(stream)
      source.connect(analyser)
      if (context.state === 'suspended') await context.resume()
      if (cancelled || !analyser) return
      const bins = new Uint8Array(analyser.frequencyBinCount)
      const waveform = typeof analyser.getFloatTimeDomainData === 'function' ? new Float32Array(analyser.fftSize) : undefined
      let previous = 0
      function paint(time: number) {
        if (cancelled || !analyser) return
        if (time - previous >= 32) {
          previous = time
          analyser.getByteFrequencyData(bins)
          const stride = Math.max(1, Math.floor(Math.min(25, bins.length) / quiet.length))
          const rawBands = quiet.map((_, index) => {
            const band = bins.subarray(index * stride, (index + 1) * stride)
            return band.reduce((sum, value) => sum + value, 0) / Math.max(1, band.length) / 255
          })
          let volume = Math.max(...rawBands)
          if (waveform) {
            analyser.getFloatTimeDomainData(waveform)
            const energy = waveform.reduce((sum, sample) => sum + sample * sample, 0)
            volume = Math.min(1, Math.sqrt(energy / Math.max(1, waveform.length)) * 3)
          }
          signal.value = {
            bands: quiet.map((base, index) => Math.min(1, base + rawBands[index] * .75)), rawBands,
            volume: signal.value.volume * .45 + volume * .55,
          }
        }
        frame = view!.requestAnimationFrame(paint)
      }
      frame = view!.requestAnimationFrame(paint)
    }

    void monitor().catch(release)
    cleanup(() => { cancelled = true; release() })
  }, { flush: 'post' })
  return { bands: computed(() => signal.value.bands), rawBands: computed(() => signal.value.rawBands), volume: computed(() => signal.value.volume) }
}
