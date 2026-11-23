<script lang="ts">
export interface TopNavMenuItem {
  id?: string
  title: string
  description?: string
  icon?: string
  href?: string
  target?: string
  disabled?: boolean
  closeOnSelect?: boolean
}
</script>

<script setup lang="ts">
import { useLayerCollisionPadding } from '../internal/layer-context'
import { computed, inject, nextTick, useId, useTemplateRef, watch } from 'vue'
import { PopoverAnchor, PopoverContent, PopoverRoot } from 'reka-ui'
import { useNavPopup } from '../internal/nav-popup'
import { topNavCompact } from '../internal/shell-layout'
import SButton from './SButton.vue'
import SIcon from './SIcon.vue'
import SNavMenu from './SNavMenu.vue'
import SNavMenuItem from './SNavMenuItem.vue'

const collisionPadding = useLayerCollisionPadding(12)
const props = withDefaults(defineProps<{
  label: string
  items: readonly TopNavMenuItem[]
  inline?: boolean
  showDelay?: number
  hideDelay?: number
}>(), { inline: undefined, showDelay: 150, hideDelay: 200 })
const emit = defineEmits<{ select: [item: TopNavMenuItem, event: MouseEvent] }>()
const open = defineModel<boolean>('open', { default: false })
const trigger = useTemplateRef('trigger')
const menu = useTemplateRef('menu')
const inlineMenu = useTemplateRef('inlineMenu')
const inlineTrigger = useTemplateRef<HTMLButtonElement>('inlineTrigger')
const navbar = inject(topNavCompact, undefined)
const inline = computed(() => props.inline ?? navbar?.value ?? false)
const menuId = `sy-top-nav-${useId()}`
const popup = useNavPopup(open, {
  trigger: () => trigger.value?.$el, panel: () => menu.value?.$el,
  showDelay: () => props.showDelay, hideDelay: () => props.hideDelay, focus: last => menu.value?.focusFirst(last),
})

function select(item: TopNavMenuItem, event: MouseEvent) {
  emit('select', item, event)
  if (popup.select(event, item.closeOnSelect) && inline.value) inlineTrigger.value?.focus({ preventScroll: true })
}

function closeInline() {
  popup.close(false)
  inlineTrigger.value?.focus({ preventScroll: true })
}

async function showInline(last = false) {
  open.value = true
  await nextTick()
  inlineMenu.value?.focusFirst(last)
}

watch(inline, () => popup.close(false))
</script>

<template>
  <template v-if="inline">
    <button ref="inlineTrigger" type="button" class="sy-navigation-link sy-top-nav__inline-trigger" aria-haspopup="menu"
      :aria-expanded="open" :aria-controls="menuId" @click="open = !open"
      @keydown.arrow-down.prevent="showInline()" @keydown.arrow-up.prevent="showInline(true)">
      {{ label }}<SIcon name="chevron" class="sy-top-nav-menu__chevron" />
    </button>
    <div class="sy-top-nav__inline-panel" :data-open="open || undefined" :inert="!open" :aria-hidden="!open || undefined"
      @pointerdown="popup.pointerDown" @keydown.esc.stop.prevent="closeInline">
      <div class="sy-top-nav__inline-clip">
        <SNavMenu :id="menuId" ref="inlineMenu" :label="label">
          <SNavMenuItem v-for="item in items" :key="item.id ?? item.href ?? item.title" :label="item.title"
            :description="item.description" :icon="item.icon" :href="item.href" :target="item.target" :disabled="item.disabled"
            @select="select(item, $event)" />
        </SNavMenu>
      </div>
    </div>
  </template>
  <PopoverRoot v-else v-model:open="open">
    <PopoverAnchor as-child>
      <SButton ref="trigger" size="sm" variant="ghost" aria-haspopup="menu" :aria-expanded="open"
        :aria-controls="open ? menuId : undefined" @pointerenter="popup.hover($event, true)" @pointerleave="popup.hover($event, false)"
        @click="popup.triggerClick" @keydown.arrow-down.prevent="popup.openWithFocus()" @keydown.arrow-up.prevent="popup.openWithFocus(true)">
        {{ label }}
        <template #end><SIcon name="chevron" class="sy-top-nav-menu__chevron" /></template>
      </SButton>
    </PopoverAnchor>
    <PopoverContent as-child align="start" :side-offset="6"
      :collision-padding="collisionPadding" @pointerenter="popup.hover($event, true)" @pointerleave="popup.hover($event, false)"
      @pointerdown="popup.pointerDown" @keydown="popup.keyboard" @interact-outside="popup.interactOutside"
      @open-auto-focus="popup.opened" @close-auto-focus="popup.closed" @escape-key-down="popup.escape">
      <div class="sy-floating-panel sy-top-nav-menu" role="presentation">
        <SNavMenu :id="menuId" ref="menu" :label="label">
          <SNavMenuItem v-for="item in items" :key="item.id ?? item.href ?? item.title" :label="item.title"
            :description="item.description" :icon="item.icon" :href="item.href" :target="item.target" :disabled="item.disabled"
            @select="select(item, $event)" />
        </SNavMenu>
      </div>
    </PopoverContent>
  </PopoverRoot>
</template>
