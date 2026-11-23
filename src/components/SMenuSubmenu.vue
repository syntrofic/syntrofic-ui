<script setup lang="ts">
import { computed, inject, useTemplateRef, watch } from 'vue'
import { DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger } from 'reka-ui'
import { dialogContainer } from '../internal/dialog-container'
import { useLayerCollisionPadding, useLayerTarget } from '../internal/layer-context'
import { useMenuPress } from '../internal/menu-press'
import { usePortalTheme } from '../internal/portal-theme'
import SThemePortalScope from '../internal/SThemePortalScope.vue'

const props = withDefaults(defineProps<{ label: string; disabled?: boolean; target?: HTMLElement | string; theme?: string; context?: boolean }>(), {})
const open = defineModel<boolean | undefined>('open', { default: undefined })
const dialog = inject(dialogContainer, null)
const layer = useLayerTarget()
const target = computed(() => props.target ?? dialog?.value ?? layer?.value)
const collisionPadding = useLayerCollisionPadding(12)
const panel = useTemplateRef<HTMLDivElement>('panel')
const trigger = useTemplateRef<{ $el: HTMLElement }>('trigger')
const portalTheme = usePortalTheme(target, () => trigger.value?.$el)
const press = useMenuPress({
  menuRef: panel, itemSelector: '.sy-menu__item[role^="menuitem"]', isEnabled: () => !props.disabled,
  onDismiss: () => { open.value = false },
})
watch(open, showing => { if (!showing) press.cancel() })

function escape(event: KeyboardEvent) {
  if (!open.value || event.defaultPrevented || event.isComposing) return
  event.preventDefault()
  event.stopPropagation()
  open.value = false
  trigger.value?.$el.focus({ preventScroll: true })
}
</script>

<template>
  <DropdownMenuSub v-model:open="open">
    <DropdownMenuSubTrigger ref="trigger" class="sy-menu__item" :disabled="disabled" :text-value="label" @keydown.esc="escape">
      <slot name="label">{{ label }}</slot><span class="sy-menu__submenu-arrow" aria-hidden="true" />
    </DropdownMenuSubTrigger>
    <Teleport :to="target ?? 'body'" :disabled="!target">
      <SThemePortalScope :theme="portalTheme">
        <DropdownMenuSubContent as-child :data-sy-theme="portalTheme ? undefined : theme" :side-offset="5" :collision-padding="collisionPadding" loop>
          <div ref="panel" class="sy-floating-panel sy-menu" data-menu-variant="submenu" :class="{ 'sy-context-menu__panel': context }"
            v-bind="press.menuProps" @keydown.esc="escape">
            <slot />
          </div>
        </DropdownMenuSubContent>
      </SThemePortalScope>
    </Teleport>
  </DropdownMenuSub>
</template>
