import { Application, Device, isAndroid, isIOS } from '@nativescript/core'
import { computed, inject, onBeforeUnmount, onMounted, provide, shallowRef, type ComputedRef, type InjectionKey } from 'nativescript-vue'
import { createNativeTheme, type NativeAppearance, type NativeDirection, type NativeGeometry, type NativeMotion, type NativePalette, type NativeSurfaceMaterial, type NativeTheme } from './theme'

export interface NativeProviderOptions {
  appearance?: NativeAppearance | 'system'
  motion?: NativeMotion
  direction?: NativeDirection
  colors?: Partial<NativePalette>
  geometry?: Partial<NativeGeometry>
  fontFamily?: string
  material?: NativeSurfaceMaterial
}

interface NativeUI {
  theme: ComputedRef<NativeTheme>
  reducedMotion: ComputedRef<boolean>
  direction: ComputedRef<NativeDirection>
  fontFamily: ComputedRef<string | undefined>
  material: ComputedRef<NativeSurfaceMaterial>
}

const nativeUI: InjectionKey<NativeUI> = Symbol('Syntrofic Native UI')

export function provideNativeUIContext(ui: NativeUI) {
  provide(nativeUI, ui)
}

const platform = globalThis as typeof globalThis & {
  UIAccessibilityIsReduceMotionEnabled?: () => boolean
  android?: { animation: { ValueAnimator: { areAnimatorsEnabled: () => boolean } } }
}

function systemReducesMotion() {
  if (isIOS) return platform.UIAccessibilityIsReduceMotionEnabled?.() ?? false
  if (isAndroid && Number.parseInt(Device.sdkVersion, 10) >= 26)
    return platform.android?.animation.ValueAnimator.areAnimatorsEnabled() === false
  return false
}

export function provideNativeUI(options: NativeProviderOptions) {
  const parent = inject(nativeUI, undefined)
  const appearance = shallowRef<NativeAppearance>('light')
  const direction = shallowRef<NativeDirection>('ltr')
  const reduced = shallowRef(false)

  function refresh() {
    const window = Application.primaryWindow
    appearance.value = window?.systemAppearance() ?? 'light'
    direction.value = window?.layoutDirection() === 'rtl' ? 'rtl' : 'ltr'
    reduced.value = systemReducesMotion()
  }

  const theme = computed(() => {
    if (!options.appearance && parent)
      return createNativeTheme(parent.theme.value.appearance, { ...parent.theme.value.colors, ...options.colors }, { ...parent.theme.value.geometry, ...options.geometry })
    return createNativeTheme(options.appearance === 'system' ? appearance.value : options.appearance ?? 'light', options.colors, options.geometry)
  })
  const ui: NativeUI = {
    theme,
    direction: computed(() => options.direction ?? parent?.direction.value ?? direction.value),
    reducedMotion: computed(() => options.motion === 'system' ? reduced.value : options.motion
      ? options.motion === 'reduced' : parent?.reducedMotion.value ?? reduced.value),
    fontFamily: computed(() => options.fontFamily ?? parent?.fontFamily.value),
    material: computed(() => options.material ?? parent?.material.value ?? 'solid'),
  }
  provideNativeUIContext(ui)
  onMounted(() => {
    refresh()
    Application.on('systemAppearanceChanged', refresh)
    Application.on('layoutDirectionChanged', refresh)
    Application.on('resume', refresh)
  })
  onBeforeUnmount(() => {
    Application.off('systemAppearanceChanged', refresh)
    Application.off('layoutDirectionChanged', refresh)
    Application.off('resume', refresh)
  })
  return ui
}

const fallback: NativeUI = {
  theme: computed(() => createNativeTheme()),
  reducedMotion: computed(systemReducesMotion),
  direction: computed(() => Application.primaryWindow?.layoutDirection() === 'rtl' ? 'rtl' : 'ltr'),
  fontFamily: computed(() => undefined),
  material: computed(() => 'solid'),
}

export function useNativeUI() {
  return inject(nativeUI, fallback)
}

export function nativeTextStyle(text: string, override?: string, weight: '400' | '600' = '400') {
  if (override) return { fontFamily: override, fontWeight: weight }
  // The Android runtime can be built without ICU script-property support.
  const chinese = /[\u3000-\u303f\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uff00-\uffef\u{20000}-\u{323af}]/u.test(text)
  if (!isAndroid) {
    return {
      fontFamily: chinese ? 'Noto Sans SC, Arial, sans-serif' : 'Arial, Arimo, sans-serif',
      fontWeight: weight,
    }
  }
  // Android needs the axis value as well as the typeface weight for bundled variable fonts.
  const variableFonts = Number.parseInt(Device.sdkVersion, 10) >= 26
  const family = chinese ? 'NotoSansSC' : 'Arimo'
  return {
    fontFamily: variableFonts ? `${family}, sans-serif` : 'sans-serif',
    fontWeight: weight,
    fontVariationSettings: variableFonts ? `'wght' ${weight}` : undefined,
  }
}
