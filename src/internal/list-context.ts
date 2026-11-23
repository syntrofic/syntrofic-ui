import type { InjectionKey, Ref } from 'vue'

export type ListDensity = 'compact' | 'balanced' | 'spacious'
export const listDensityContext: InjectionKey<Readonly<Ref<ListDensity>> | null> = Symbol('syntrofic list density')
