<script setup lang="ts">
import { onMounted, useSlots, watch } from 'vue'
import { useTooltip } from '../internal/tooltip'
import type { SemanticIconSize } from '../internal/icons'
import { useTranslator } from '../rac/locale'
import SButton from './SButton.vue'
import SIcon from './SIcon.vue'

defineOptions({ inheritAttrs: false })
const props = withDefaults(defineProps<{ label?: string; text?: string; size?: SemanticIconSize }>(), { size: 'sm' })
const pinned = defineModel<boolean>('open', { default: false })
const slots = useSlots()
const translate = useTranslator({ 'field.moreInfo': 'More information' })
const tip = useTooltip({
  focusTrigger: 'always', touchTrigger: 'none',
  onHide() { pinned.value = false },
})
const { ref: bind, isOpen: preview, describedBy, renderTooltip } = tip
const Content = () => renderTooltip(() => slots.default?.() ?? props.text, { class: 'sy-info-tip__content' })
let pinnedAtPress: boolean | undefined

function toggle(event: MouseEvent) {
  // Some touch browsers blur and refocus the same button between pointerdown and click.
  const wasPinned = event.detail ? pinnedAtPress ?? pinned.value : pinned.value
  pinnedAtPress = undefined
  pinned.value = !wasPinned
}

watch(pinned, open => { if (open) tip.show(); else tip.hide() }, { flush: 'post' })
onMounted(() => { if (pinned.value) tip.show() })
</script>

<template>
  <SButton :ref="bind" v-bind="$attrs" size="sm" variant="ghost" class="sy-info-tip" :aria-label="label ?? translate('field.moreInfo')"
    :aria-expanded="pinned" :aria-controls="pinned ? describedBy : undefined"
    :aria-describedby="preview && !pinned ? describedBy : undefined" @click="toggle" @blur="pinned = false"
    @pointerdown="pinnedAtPress = pinned" @pointercancel="pinnedAtPress = undefined">
    <SIcon name="info" :size="size" />
  </SButton>
  <Content />
</template>
