<script setup lang="ts">
import { useLayerCollisionPadding } from '../internal/layer-context'
import { computed, inject, nextTick, provide, useId, useTemplateRef, watch } from 'vue'
import { PopoverAnchor, PopoverContent, PopoverRoot } from 'reka-ui'
import { useNavPopup } from '../internal/nav-popup'
import { megaMenuSelect, topNavCompact } from '../internal/shell-layout'
import SButton from './SButton.vue'
import SIcon from './SIcon.vue'

const props = withDefaults(defineProps<{
  label: string
  inline?: boolean
  showDelay?: number
  hideDelay?: number
}>(), { inline: undefined, showDelay: 150, hideDelay: 250 })
const emit = defineEmits<{ openChange: [open: boolean] }>()
const open = defineModel<boolean>('open', { default: false })
const navbar = inject(topNavCompact, undefined)
const inline = computed(() => props.inline ?? navbar?.value ?? false)
const trigger = useTemplateRef<{ $el: HTMLButtonElement }>('trigger')
const surface = useTemplateRef<HTMLElement>('surface')
const mobilePanel = useTemplateRef<HTMLElement>('mobilePanel')
const mobileTrigger = useTemplateRef<HTMLButtonElement>('mobileTrigger')
const nav = computed(() => trigger.value?.$el.closest<HTMLElement>('.sy-navbar__bar, nav'))
const id = `sy-mega-nav-${useId()}`

function focus(last = false) {
  const container = inline.value ? mobilePanel.value : surface.value
  const selector = 'a[href], button:not([disabled]), [tabindex="0"]'
  const items = container?.querySelector('.sy-top-nav-mega__items')?.querySelectorAll<HTMLElement>(selector)
  const target = items?.length ? items[last ? items.length - 1 : 0] : container?.querySelector<HTMLElement>(selector)
  target?.focus()
}

const popup = useNavPopup(open, {
  trigger: () => trigger.value?.$el,
  panel: () => surface.value ?? undefined,
  showDelay: () => props.showDelay, hideDelay: () => props.hideDelay, focus,
})
provide(megaMenuSelect, (event, closeOnSelect) => {
  if (popup.select(event, closeOnSelect) && inline.value) mobileTrigger.value?.focus({ preventScroll: true })
})

function closeInline() {
  open.value = false
  mobileTrigger.value?.focus({ preventScroll: true })
}

async function showInline(last = false) {
  open.value = true
  await nextTick()
  focus(last)
}

watch(inline, () => popup.close(false))
watch(open, next => emit('openChange', next))
const collisionPadding = useLayerCollisionPadding(8)
</script>

<template>
  <template v-if="inline">
    <button ref="mobileTrigger" type="button" class="sy-navigation-link sy-top-nav__inline-trigger" :aria-expanded="open" :aria-controls="id"
      @click="open = !open" @keydown.arrow-down.prevent="showInline()" @keydown.arrow-up.prevent="showInline(true)">
      {{ label }}<SIcon name="chevron" class="sy-top-nav-menu__chevron" />
    </button>
    <div :id="id" ref="mobilePanel" class="sy-top-nav__inline-panel" :data-open="open || undefined" data-inline role="region" :aria-label="label"
      :inert="!open" :aria-hidden="!open || undefined"
      @pointerdown="popup.pointerDown" @keydown.esc.stop.prevent="closeInline">
      <div class="sy-top-nav__inline-clip">
        <div class="sy-top-nav-mega__body" data-inline>
          <ul class="sy-top-nav-mega__items" role="list"><slot name="items" :compact="true" /></ul>
          <div v-if="$slots.featured" class="sy-top-nav-mega__featured"><slot name="featured" :compact="true" /></div>
        </div>
      </div>
    </div>
  </template>
  <PopoverRoot v-else v-model:open="open">
    <PopoverAnchor as-child :reference="nav ?? undefined">
      <SButton ref="trigger" size="sm" variant="ghost" :aria-expanded="open" :aria-controls="open ? id : undefined"
        @pointerenter="popup.hover($event, true)" @pointerleave="popup.hover($event, false)" @click="popup.triggerClick"
        @keydown.arrow-down.prevent="popup.openWithFocus()" @keydown.arrow-up.prevent="popup.openWithFocus(true)">
        {{ label }}
        <template #end><SIcon name="chevron" class="sy-top-nav-menu__chevron" /></template>
      </SButton>
    </PopoverAnchor>
    <PopoverContent as-child align="start" :side-offset="6" :collision-padding="collisionPadding"
      @pointerenter="popup.hover($event, true)" @pointerleave="popup.hover($event, false)"
      @pointerdown="popup.pointerDown" @keydown="popup.keyboard" @interact-outside="popup.interactOutside"
      @open-auto-focus="popup.opened" @close-auto-focus="popup.closed" @escape-key-down="popup.escape">
      <div :id="id" role="region" :aria-label="label" class="sy-floating-panel sy-top-nav-mega" :data-anchored="Boolean(nav) || undefined">
        <div ref="surface" class="sy-top-nav-mega__body" :data-featured="Boolean($slots.featured) || undefined">
          <ul class="sy-top-nav-mega__items" role="list"><slot name="items" :compact="false" /></ul>
          <div v-if="$slots.featured" class="sy-top-nav-mega__featured"><slot name="featured" :compact="false" /></div>
        </div>
      </div>
    </PopoverContent>
  </PopoverRoot>
</template>
