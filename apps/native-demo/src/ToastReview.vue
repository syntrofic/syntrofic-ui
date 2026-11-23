<script setup lang="ts">
import { ref } from 'nativescript-vue'
import { SNativeButton, SNativeDialog, SNativeMotionText, SNativeToastProvider, type NativeToastControls } from '@syntrofic/ui-native'

const result = ref('')

function addBurst(toast: NativeToastControls) {
  toast.show({ label: '封面图已同步', tone: 'success', duration: 2200 })
  toast.show({ label: '配色规范已同步', tone: 'success', duration: 2200 })
  toast.show({ label: '字体授权待核对', tone: 'warning', duration: 2200 })
  toast.show({ label: '源文件已同步', tone: 'success', duration: 2200 })
}

function archive(toast: NativeToastControls) {
  result.value = '品牌资源库已归档'
  toast.show({
    id: 'archive-project',
    label: '项目已归档',
    description: '品牌资源库',
    tone: 'accent',
    actionLabel: '撤销',
    duration: 'persistent',
    onAction({ dismiss }) {
      result.value = '品牌资源库已恢复'
      dismiss()
    },
  })
}
</script>

<template>
  <SNativeToastProvider :maxVisible="2" closeLabel="关闭通知">
    <template #default="{ toast }">
      <StackLayout padding="16">
        <SNativeButton label="发送四条通知" @tap="addBurst(toast)" />
        <SNativeButton label="归档并显示撤销" variant="secondary" marginTop="8" @tap="archive(toast)" />
        <SNativeButton
          label="显示顶部提醒"
          variant="secondary"
          marginTop="8"
          @tap="toast.show({ label: '同步已暂停', description: '网络恢复后继续。', tone: 'danger', placement: 'top' })"
        />
        <SNativeButton label="关闭全部通知" variant="ghost" size="sm" marginTop="4" @tap="toast.hide('all')" />
        <SNativeDialog triggerLabel="从对话框发送" title="项目同步" description="通知会出现在当前对话框上方。" showClose closeLabel="关闭同步对话框" marginTop="8">
          <template #footer>
            <SNativeButton label="发送通知" size="sm" @tap="toast.show({ label: '项目已同步', tone: 'success', placement: 'top' })" />
          </template>
        </SNativeDialog>
        <SNativeMotionText :value="result" minHeight="24" marginTop="6" announce />
      </StackLayout>
    </template>
  </SNativeToastProvider>
</template>
