<script setup lang="ts">
import { computed, inject, provide } from 'vue'
import { syntaxThemeContext } from '../internal/theme-context'
import { syntaxStyle, type SyntaxThemeColors, type SyntaxThemeDefinition } from '../internal/syntax-theme'

const props = defineProps<{ palette?: SyntaxThemeColors; theme?: SyntaxThemeDefinition }>()
const parent = inject(syntaxThemeContext, null)
const theme = computed<SyntaxThemeDefinition>(() => ({
  name: props.theme?.name ?? parent?.value?.name ?? 'custom',
  tokens: { ...parent?.value?.tokens, ...props.theme?.tokens, ...props.palette },
}))
const tokens = computed(() => syntaxStyle(theme.value.tokens))
provide(syntaxThemeContext, theme)
</script>

<template>
  <div class="sy-syntax-theme" :data-syntax-theme="theme.name" :style="tokens"><slot /></div>
</template>
