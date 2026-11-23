import type { View } from '@nativescript/core'
import type { InjectionKey } from 'nativescript-vue'

export const nativeFocusGroup: InjectionKey<{ focus: (view: View) => void; blur: (view: View) => void }> = Symbol('Native input focus group')
