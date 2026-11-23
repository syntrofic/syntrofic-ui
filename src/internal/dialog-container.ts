import type { InjectionKey, ShallowRef } from 'vue'

export const dialogContainer: InjectionKey<Readonly<ShallowRef<HTMLDialogElement | null>>> = Symbol('dialog-container')
