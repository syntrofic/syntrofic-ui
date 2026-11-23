<script setup lang="ts">
import { onBeforeUnmount, ref, useTemplateRef } from 'nativescript-vue'
import {
  SNativeButton, SNativeDialog, SNativeMotionText, SNativeTextField,
  type NativeDialogCloseReason,
} from '@syntrofic/ui-native'
import type { ReviewID } from './review-items'

defineProps<{ id: ReviewID }>()

const archive = useTemplateRef<InstanceType<typeof SNativeDialog>>('archive')
const shortcut = useTemplateRef<InstanceType<typeof SNativeButton>>('shortcut')
const cancelArchive = useTemplateRef<InstanceType<typeof SNativeButton>>('cancelArchive')
const nameInput = useTemplateRef<InstanceType<typeof SNativeTextField>>('nameInput')
const open = ref(false)
const confirming = ref(false)
const name = ref('品牌资源库')
const draft = ref(name.value)
const result = ref('')
let task: ReturnType<typeof setTimeout> | undefined

function finishArchive(close: (reason: NativeDialogCloseReason) => void) {
  if (confirming.value) return
  confirming.value = true
  task = setTimeout(() => {
    confirming.value = false
    result.value = `已归档「${name.value}」`
    close('confirm')
  }, 650)
}

function archived() {
  if (task !== undefined) clearTimeout(task)
  task = undefined
  confirming.value = false
}

onBeforeUnmount(archived)
</script>

<template>
  <StackLayout v-if="id === 'N.dialog'">
    <SNativeDialog
      ref="archive"
      v-model:open="open"
      triggerLabel="归档项目"
      title="归档项目？"
      :description="`「${name}」归档后可恢复。`"
      :dismissOnOutside="!confirming"
      :dismissOnBack="!confirming"
      :swipeToDismiss="!confirming"
      :initialFocus="() => cancelArchive?.focus()"
      @closed="archived"
    >
      <template #footer="{ close }">
        <SNativeButton ref="cancelArchive" label="取消" variant="secondary" size="sm" marginRight="6" :disabled="confirming" @tap="close('cancel')" />
        <SNativeButton label="归档项目" variant="danger" size="sm" :loading="confirming" loadingLabel="正在归档" @tap="finishArchive(close)" />
      </template>
    </SNativeDialog>
    <SNativeButton
      ref="shortcut"
      label="从项目操作打开"
      variant="ghost"
      size="sm"
      marginTop="4"
      @tap="archive?.show(() => shortcut?.focus())"
    />
    <SNativeDialog
      triggerLabel="编辑名称"
      title="编辑项目名称"
      showClose
      closeLabel="关闭编辑对话框"
      marginTop="4"
      :initialFocus="() => nameInput?.focus()"
    >
      <SNativeTextField ref="nameInput" v-model="draft" label="项目名称" returnKeyType="done" />
      <template #footer="{ close }">
        <SNativeButton
          label="保存名称"
          size="sm"
          :disabled="!draft.trim()"
          @tap="name = draft.trim(); close('confirm')"
        />
      </template>
    </SNativeDialog>
    <SNativeMotionText :value="result" minHeight="24" marginTop="6" announce />
  </StackLayout>
</template>
