<script lang="ts">
import type { ButtonVariant } from '../types'

export interface ActionBarAction {
  id: string
  label: string
  shortLabel?: string
  variant?: ButtonVariant
  disabled?: boolean
  loading?: boolean
}
</script>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { ToolbarButton, ToolbarRoot } from 'reka-ui'
import SButton from './SButton.vue'
import SMotionText from './SMotionText.vue'

const props = withDefaults(defineProps<{
  count?: number
  defaultOpen?: boolean
  label?: string
  selectedLabel?: string
  renderSelectionLabel?: (count: number) => string
  unitLabel?: string
  clearLabel?: string
  countDigits?: number
  countPosition?: 'start' | 'end'
  size?: 'sm' | 'md' | 'lg'
  actions?: readonly ActionBarAction[]
  attached?: boolean
  dismissible?: boolean
  position?: 'floating' | 'inline'
  orientation?: 'horizontal' | 'vertical'
  direction?: 'ltr' | 'rtl'
  disabled?: boolean
  loop?: boolean
  returnFocus?: () => HTMLElement | null
}>(), {
  label: 'Selection actions', selectedLabel: 'Selected', clearLabel: 'Clear selection', countDigits: 3,
  actions: () => [], attached: true, dismissible: true, position: 'floating', orientation: 'horizontal', loop: true, size: 'sm', countPosition: 'start',
})

const open = defineModel<boolean | undefined>('open', { default: undefined })
const emit = defineEmits<{ action: [action: ActionBarAction, event: MouseEvent]; clear: [event: Event] }>()
const count = computed(() => Number.isFinite(props.count) ? Math.max(0, Math.floor(props.count ?? 0)) : undefined)
const countLabel = computed(() => count.value === undefined ? '' : props.renderSelectionLabel?.(count.value)
  ?? [props.selectedLabel, count.value, props.unitLabel].filter(part => part !== undefined).join(' '))
const visible = computed(() => open.value ?? (count.value === undefined ? props.defaultOpen ?? false : count.value > 0))
const anchor = ref<HTMLElement | null>(null)
let previous: HTMLElement | null = null

function clear(event: Event) {
  if (!props.dismissible || props.disabled || event.defaultPrevented) return
  emit('clear', event)
  if (!event.defaultPrevented && (open.value !== undefined || count.value === undefined)) open.value = false
}

function escape(event: KeyboardEvent) {
  if (!props.dismissible || props.disabled || event.defaultPrevented) return
  clear(event)
  event.preventDefault()
}

function activate(action: ActionBarAction, event: MouseEvent) {
  if (!props.disabled && !action.disabled && !action.loading) emit('action', action, event)
}

watch(visible, async (next, before) => {
  const node = anchor.value
  if (!node) return
  const owner = node.ownerDocument
  const focused = owner.activeElement as HTMLElement | null
  if (next) {
    if (focused && focused !== owner.body && !node.contains(focused)) previous = focused
    return
  }
  if (!before || !node.contains(focused)) return
  await nextTick()
  if (visible.value) return
  const destination = props.returnFocus?.() ?? previous
  if (destination?.isConnected) destination.focus({ preventScroll: true })
})
</script>

<template>
  <div ref="anchor" class="sy-action-bar" :data-position="position">
    <span class="sy-visually-hidden" role="status">{{ countLabel }}</span>
    <Transition name="sy-action-bar">
      <div v-show="visible" class="sy-action-bar__position" :inert="!visible" :aria-hidden="!visible || undefined">
        <ToolbarRoot
          class="sy-action-bar__surface" :data-attached="attached || undefined" :data-orientation="orientation" :data-count-position="countPosition"
          :orientation="orientation" :dir="direction" :loop="loop" :aria-label="label" @keydown.esc="escape"
        >
          <div v-if="$slots.prefix || count !== undefined" class="sy-action-bar__prefix">
            <slot name="prefix" :count="count">
              <SMotionText v-if="renderSelectionLabel" :value="countLabel" motion="roll" class="sy-action-bar__count" aria-hidden="true" />
              <span v-else class="sy-action-bar__count" aria-hidden="true">
                <span>{{ selectedLabel }}</span>
                <span class="sy-action-bar__number" :style="{ '--sy-action-count-width': `${Math.max(1, countDigits)}ch` }">
                  <SMotionText :value="String(count)" motion="roll" />
                </span>
                <span v-if="unitLabel">{{ unitLabel }}</span>
              </span>
            </slot>
          </div>
          <div v-if="$slots.default || actions.length" class="sy-action-bar__actions">
            <slot :count="count">
              <ToolbarButton v-for="action in actions" :key="action.id" as-child :disabled="disabled || action.disabled">
                <SButton
                  :size="size" :variant="action.variant ?? 'ghost'" :disabled="disabled || action.disabled" :loading="action.loading"
                  :aria-label="action.label" @click="activate(action, $event)"
                >
                  <slot name="action" :action="action" :count="count">
                    <span :class="{ 'sy-action-bar__long-label': action.shortLabel }">{{ action.label }}</span>
                    <span v-if="action.shortLabel" class="sy-action-bar__short-label" aria-hidden="true">{{ action.shortLabel }}</span>
                  </slot>
                </SButton>
              </ToolbarButton>
            </slot>
          </div>
          <div v-if="$slots.suffix || dismissible" class="sy-action-bar__suffix">
            <slot name="suffix" :count="count" :clear="clear">
              <ToolbarButton v-if="dismissible" as-child :disabled="disabled">
                <SButton :size="size" variant="secondary" :disabled="disabled" @click="clear">{{ clearLabel }}</SButton>
              </ToolbarButton>
            </slot>
          </div>
        </ToolbarRoot>
      </div>
    </Transition>
  </div>
</template>
