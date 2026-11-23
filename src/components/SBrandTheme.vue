<script setup lang="ts">
import { computed, inject, provide, useTemplateRef } from 'vue'
import { useBrandNavigationMotion } from '../internal/brand-navigation-motion'
import { useBrandPieceMotion } from '../internal/brand-piece-motion'
import { provideIcons, type IconSet } from '../internal/icons'
import { provideThemeSurface, useThemeScopeId } from '../internal/portal-theme'
import { reducedMotionContext } from '../internal/reduced-motion'
import { syntaxThemeContext, themeDefinitionContext, themeModeContext, themeNameContext, useThemeMode } from '../internal/theme-context'
import { brandThemeStyle, type BrandMode, type BrandTheme } from '../platform/theme-workspace'
import { brandRuleStyle, resolveBrandThemeRules } from '../platform/brand-rules'

const props = defineProps<{ theme: BrandTheme; mode?: BrandMode | 'system'; icons?: IconSet }>()
const system = useThemeMode(true)
const mode = computed(() => props.mode === 'system' ? system.value : props.mode ?? (props.theme.design?.appearance === 'dark-only' ? 'dark' : 'light'))
const palettes = computed(() => ({ light: brandThemeStyle(props.theme, 'light'), dark: brandThemeStyle(props.theme, 'dark') }))
const tokens = computed(() => palettes.value[mode.value])
const resolved = computed(() => resolveBrandThemeRules(props.theme).rules)
const scope = useThemeScopeId()
const scopedRules = (selector: string) => brandRuleStyle(resolved.value, selector, mode.value, undefined, palettes.value)
const rules = computed(() => scopedRules(scope.selector))
const root = useTemplateRef<HTMLElement>('root')
const inheritedMotion = inject(reducedMotionContext, null)
const reducedMotion = computed(() => inheritedMotion?.value === true || props.theme.motion?.reducedMotion === 'always')
provide(reducedMotionContext, reducedMotion)
provideThemeSurface(root, () => ({ brand: props.theme.id, mode: mode.value, rules: scopedRules, style: tokens.value, reducedMotion: reducedMotion.value }))
useBrandNavigationMotion(root, resolved)
useBrandPieceMotion(root, resolved)
const parentSyntax = inject(syntaxThemeContext, null)
provide(themeNameContext, computed(() => props.theme.id))
provide(themeModeContext, mode)
provide(themeDefinitionContext, computed(() => props.theme))
provide(syntaxThemeContext, computed(() => props.theme.syntax ?? parentSyntax?.value ?? null))
provideIcons(() => props.icons ?? {}, () => props.theme.id)
</script>

<template>
  <div ref="root" :data-sy-scope-id="scope.id" :data-sy-brand="theme.id" :data-sy-theme="mode" :data-sy-reduced-motion="reducedMotion || undefined" :style="tokens">
    <component :is="'style'" v-if="rules" v-html="rules" />
    <slot :mode="mode" />
  </div>
</template>
