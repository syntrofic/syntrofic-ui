<script setup lang="ts">
import { computed, inject, provide, useTemplateRef } from 'vue'
import { useImageMode, useSurfaceMode, type ImageMode, type ImageSampleRegion } from '../internal/media-theme'
import { provideThemeSurface, useThemeScopeId } from '../internal/portal-theme'
import { themeDefinitionContext, themeModeContext, useThemeMode } from '../internal/theme-context'
import { resolveThemeTokens } from '../internal/theme-tokens'
import { mediaThemeStyle } from '../platform/theme-workspace'
import { brandRuleStyle, resolveBrandThemeRules } from '../platform/brand-rules'

const props = withDefaults(defineProps<{ mode?: ImageMode | 'auto' | 'off'; src?: string; fallback?: ImageMode; region?: ImageSampleRegion; threshold?: number }>(), {
  mode: 'auto', fallback: 'dark',
})
const root = useTemplateRef<HTMLElement>('root')
const theme = inject(themeDefinitionContext, null)
const parentMode = useThemeMode()
const detected = useImageMode(() => props.mode === 'auto' ? props.src : undefined,
  () => ({ region: props.region, threshold: props.threshold, fallback: props.fallback }))
const advanced = computed(() => {
  const definition = theme?.value
  return {
    light: definition?.media?.light?.colors?.text ?? resolveThemeTokens(definition, { mode: 'light' })['--sy-text'],
    dark: definition?.media?.dark?.colors?.text ?? resolveThemeTokens(definition, { mode: 'dark' })['--sy-text'],
  }
})
const painted = useSurfaceMode(root, () => ({ enabled: props.mode === 'auto' && !props.src, ...advanced.value }))
const appearance = computed(() => props.mode !== 'auto' ? props.mode : (props.src ? detected.value : painted.value) ?? props.fallback)
provide(themeModeContext, computed(() => appearance.value === 'off' ? parentMode.value : appearance.value))
const palettes = computed(() => theme?.value && { light: mediaThemeStyle(theme.value, 'light'), dark: mediaThemeStyle(theme.value, 'dark') })
const tokens = computed(() => appearance.value !== 'off' ? palettes.value?.[appearance.value] : undefined)
const scoped = computed(() => appearance.value !== 'off' && theme?.value.rules && Object.keys(theme.value.rules).length ? theme.value : undefined)
const scope = useThemeScopeId()
const scopedRules = (selector: string) => appearance.value !== 'off'
  ? brandRuleStyle(resolveBrandThemeRules(scoped.value).rules, selector, appearance.value, undefined, palettes.value) : ''
const rules = computed(() => scopedRules(scope.selector))
provideThemeSurface(root, () => appearance.value === 'off' ? undefined : ({
  brand: theme?.value.id, mode: appearance.value, rules: scopedRules, style: tokens.value,
}))
</script>

<template>
  <div ref="root" class="sy-media-theme" :data-sy-scope-id="scope.id" :data-media-mode="appearance" :data-sy-theme="appearance === 'off' ? undefined : appearance"
    :data-sy-brand="scoped?.id" :style="tokens">
    <component :is="'style'" v-if="rules" v-html="rules" />
    <slot :mode="appearance" />
  </div>
</template>
