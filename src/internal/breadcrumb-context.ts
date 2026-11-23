import type { InjectionKey, Ref } from 'vue'

export const breadcrumbSeparator: InjectionKey<Readonly<Ref<string>>> = Symbol('breadcrumb separator')
