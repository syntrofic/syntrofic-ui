<script setup lang="ts">
import { nextTick, useId, useTemplateRef, watch } from 'vue'
import { useTruncation } from './interaction'
import SButton from '../components/SButton.vue'

const props = defineProps<{ text: string; label: string; moreLabel: string; closeLabel: string }>()
const expanded = defineModel<boolean>({ default: false })
const emit = defineEmits<{ returnFocus: [] }>()
const id = useId()
const measure = useTemplateRef<HTMLElement>('measure')
const more = useTemplateRef<HTMLButtonElement>('more')
const panel = useTemplateRef<HTMLElement>('panel')
const truncated = useTruncation(measure)

watch(expanded, visible => {
  if (visible) {
    void nextTick(() => { if (expanded.value) panel.value?.focus({ preventScroll: true }) })
  } else if (panel.value?.contains(panel.value.ownerDocument.activeElement)) {
    void nextTick(() => {
      if (expanded.value) return
      if (more.value) more.value.focus({ preventScroll: true })
      else emit('returnFocus')
    })
  }
})
watch(() => props.text, () => { expanded.value = false })
watch(truncated, visible => {
  if (!visible && !expanded.value && more.value?.matches(':focus')) emit('returnFocus')
})

function hide(element: Element) {
  element.setAttribute('aria-hidden', 'true')
  element.setAttribute('inert', '')
}
</script>

<template>
  <figcaption class="sy-lightbox__caption">
    <span ref="measure" class="sy-lightbox__caption-measure sy-line-clamp" aria-hidden="true">{{ text }}</span>
    <span class="sy-lightbox__caption-preview" :aria-hidden="expanded || undefined">
      <Transition name="sy-lightbox-caption-text" @before-leave="hide">
        <span v-if="text" :key="text" class="sy-line-clamp">{{ text }}</span>
      </Transition>
    </span>
    <Transition name="sy-standard-fade" @before-leave="hide">
      <button v-if="truncated || expanded" ref="more" class="sy-lightbox__caption-more" type="button" :aria-expanded="expanded"
        :aria-controls="id" @click="expanded = !expanded">{{ moreLabel }}</button>
    </Transition>
    <Transition name="sy-lightbox-caption-panel" @before-leave="hide">
      <section v-if="expanded" :id="id" ref="panel" class="sy-lightbox__caption-panel" tabindex="-1"
        :aria-label="label" :aria-describedby="id + '-text'">
        <header><strong>{{ label }}</strong><SButton variant="ghost" size="sm" @click="expanded = false">{{ closeLabel }}</SButton></header>
        <p :id="id + '-text'">{{ text }}</p>
      </section>
    </Transition>
  </figcaption>
</template>
