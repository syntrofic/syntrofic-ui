import type { InjectionKey } from 'vue'
import type { AvatarShape, AvatarSize } from '../components/SAvatar.vue'

export const avatarGroupContext: InjectionKey<(() => { size: AvatarSize; shape: AvatarShape }) | null> = Symbol('Syntrofic avatar group')
export const avatarStatusContext: InjectionKey<((key: symbol, label?: string) => void) | null> = Symbol('Syntrofic avatar status')
