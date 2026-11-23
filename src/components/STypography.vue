<script setup lang="ts">
import { computed } from 'vue'
import SLineClamp from './SLineClamp.vue'
import { useDirection } from '../rac/locale'

export type TypographyVariant = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'body' | 'body-sm' | 'lead' | 'caption' | 'code' | 'prose'
export type DisplayTypographyRole = 'display-1' | 'display-2' | 'display-3'
export type TypographyRole = 'body' | 'large' | 'label' | 'supporting' | 'code' | DisplayTypographyRole | 'inherit'
export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6
export type TypographySize = '4xs' | '3xs' | '2xs' | 'xsm' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl'
export type TypographyColor = 'primary' | 'secondary' | 'disabled' | 'placeholder' | 'accent' | 'inherit'
export type TypographyWeight = 'normal' | 'medium' | 'semibold' | 'bold'
type TextTag = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'span' | 'div' | 'small' | 'code' | 'strong' | 'em' | 'article' | 'section' | 'label' | 'time'

export interface TypographyProps {
  as?: TextTag
  variant?: TypographyVariant
  type?: TypographyRole
  size?: TypographySize
  color?: TypographyColor
  weight?: TypographyWeight
  display?: 'inline' | 'block'
  tone?: 'default' | 'muted' | 'accent' | 'danger'
  align?: 'start' | 'center' | 'end'
  justify?: 'start' | 'center' | 'end'
  accessibilityLevel?: HeadingLevel
  balance?: boolean
  maxLines?: number
  hasTruncateTooltip?: boolean | 'above' | 'below' | 'start' | 'end'
  wordBreak?: 'break-word' | 'break-all'
  textWrap?: 'wrap' | 'nowrap' | 'balance' | 'pretty'
  capsize?: boolean
  strikethrough?: boolean
  tabularNumbers?: boolean
}
const props = withDefaults(defineProps<TypographyProps>(), { variant: 'body', tone: 'default', align: 'start', hasTruncateTooltip: true })

const tagForVariant: Record<TypographyVariant, TextTag> = {
  h1: 'h1', h2: 'h2', h3: 'h3', h4: 'h4', h5: 'h5', h6: 'h6',
  body: 'p', 'body-sm': 'p', lead: 'p', caption: 'small', code: 'code', prose: 'div',
}
const variantForRole: Record<TypographyRole, TypographyVariant> = {
  body: 'body', large: 'lead', label: 'body-sm', supporting: 'caption', code: 'code',
  'display-1': 'h1', 'display-2': 'h2', 'display-3': 'h3', inherit: 'body',
}
const sizes: Record<TypographySize, string> = {
  '4xs': '.625rem', '3xs': '.6875rem', '2xs': '.75rem', xsm: '.8125rem', sm: '.875rem', base: '1rem',
  lg: '1.125rem', xl: '1.25rem', '2xl': '1.5rem', '3xl': '1.75rem', '4xl': '2rem',
}
const weights = { normal: 400, medium: 500, semibold: 600, bold: 700 }
const appearance = computed(() => props.type ? variantForRole[props.type] : props.variant)
const tag = computed<TextTag>(() => {
  const element = props.as ?? (props.type ? props.type === 'code' ? 'code' : 'span' : tagForVariant[props.variant])
  return props.accessibilityLevel && /^h[1-6]$/.test(element) ? `h${props.accessibilityLevel}` : element
})
const lines = computed(() => typeof props.maxLines === 'number' && Number.isFinite(props.maxLines) && props.maxLines >= 1 ? Math.floor(props.maxLines) : undefined)
const hasTooltip = computed(() => lines.value !== undefined && props.hasTruncateTooltip !== false)
const direction = useDirection()
const tooltipSide = computed(() => {
  switch (props.hasTruncateTooltip) {
    case 'below': return 'bottom'
    case 'start': return direction.value === 'rtl' ? 'right' : 'left'
    case 'end': return direction.value === 'rtl' ? 'left' : 'right'
    default: return 'top'
  }
})
const attributes = computed(() => ({
  class: ['sy-type', { 'sy-line-clamp': lines.value }],
  style: { '--sy-clamp-lines': lines.value,
    fontSize: props.size ? `var(--sy-text-size-${props.size}, ${sizes[props.size]})` : undefined,
    fontWeight: props.weight ? weights[props.weight] : undefined,
  },
  role: props.accessibilityLevel ? 'heading' : undefined,
  'aria-level': props.accessibilityLevel,
  'data-variant': appearance.value,
  'data-type': props.type,
  'data-tone': props.tone,
  'data-color': props.color ?? (props.type === 'supporting' ? 'secondary' : undefined),
  'data-align': props.justify ?? props.align,
  'data-balance': props.balance || undefined,
  'data-wrap': props.textWrap ?? (props.balance ? 'balance' : undefined),
  'data-word-break': props.wordBreak ?? (lines.value === 1 ? 'break-all' : undefined),
  'data-display': lines.value ? undefined : props.capsize ? 'block' : props.display,
  'data-capsize': props.capsize || undefined,
  'data-strike': props.strikethrough || undefined,
  'data-tabular': props.tabularNumbers || undefined,
}))
</script>

<template>
  <component :is="hasTooltip ? SLineClamp : tag"
    v-bind="{ ...attributes, ...(hasTooltip ? { as: tag, maxLines: lines, tooltip: true, tooltipSide } : {}) }"><slot /></component>
</template>
