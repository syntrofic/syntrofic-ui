import type { InjectionKey } from 'vue'

export type ItemCardVariant = 'default' | 'secondary' | 'tertiary' | 'outline' | 'transparent' | 'inherit'

export const itemCardGroup: InjectionKey<boolean> = Symbol('item-card-group')
