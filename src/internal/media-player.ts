import { inject, type InjectionKey, type Ref } from 'vue'

export interface MediaPlayerState {
  playing: boolean
  ended: boolean
  waiting: boolean
  currentTime: number
  duration: number
  bufferedEnd: number
  volume: number
  muted: boolean
  playbackRate: number
  fullscreen: boolean
  canFullscreen: boolean
  activeTrack: string | null
  hasTextTracks: boolean
  error: unknown
}

export interface MediaPlayerContext {
  state: Readonly<MediaPlayerState>
  play: () => Promise<void>
  pause: () => void
  togglePaused: () => Promise<void>
  seek: (time: number) => void
  seekBy: (offset: number) => void
  setVolume: (volume: number) => void
  setMuted: (muted: boolean) => void
  toggleMuted: () => void
  setPlaybackRate: (rate: number) => void
  toggleFullscreen: () => Promise<void>
  setTextTrack: (id: string | null) => void
  toggleCaptions: () => void
  reload: () => void
  formatTime: (seconds: number) => string
}

export const mediaPlayerContext: InjectionKey<MediaPlayerContext> = Symbol('Syntrofic media player')
export const mediaPlaybackTime: InjectionKey<Readonly<Ref<number>>> = Symbol('Syntrofic media playback time')

export function useMediaPlayer() {
  const context = inject(mediaPlayerContext, undefined)
  if (!context) throw new Error('useMediaPlayer requires an enclosing SMediaPlayer.')
  return context
}

export function useMediaPlaybackTime() {
  const time = inject(mediaPlaybackTime, undefined)
  if (!time) throw new Error('useMediaPlaybackTime requires an enclosing SMediaPlayer.')
  return time
}
