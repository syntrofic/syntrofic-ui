<script setup lang="ts">
import { onBeforeUnmount, ref } from 'nativescript-vue'
import {
  SNativeButton, SNativeFAB, SNativeMorphButton, SNativeMotionText, SNativeProgressButton, SNativeProvider, SNativeSlideButton,
  SNativeSocialAuthButton, SNativeSurface, SNativeText, SNativeToggleButton, SNativeToggleButtonGroup,
  type NativeActionStatus, type NativeFabAction, type NativeMorphDirection, type NativeSocialProvider,
} from '@syntrofic/ui-native'

defineProps<{ id: string }>()
const items: NativeFabAction[] = [
  { id: 'audit', label: '复核清单' },
  { id: 'stamp', label: '登记签名' },
  { id: 'seal', label: '关闭归档', disabled: true },
]
const filterOptions = [{ id: 'today', label: '今天' }, { id: 'week', label: '本周' }, { id: 'saved', label: '归档', disabled: true }]
const formats = [{ id: 'docs', label: '文档' }, { id: 'media', label: '图片' }, { id: 'code', label: '源文件' }]
const open = ref(false)
const blurred = ref(false)
const corner = ref<NativeMorphDirection>('bottom-end')
const rightToLeft = ref(false)
const signature = ref(false)
const hold = ref(false)
const slide = ref(false)
const status = ref<NativeActionStatus>('idle')
const progress = ref(0)
const social = ref<'ready' | 'loading' | 'error'>('ready')
const account = ref<NativeSocialProvider>()
const output = ref('')
const single = ref<readonly (string | number)[]>(['today'])
const multiple = ref<readonly (string | number)[]>(['docs'])
let work: ReturnType<typeof setInterval> | undefined
let login: ReturnType<typeof setTimeout> | undefined

function simulate(shouldFail: boolean) {
  if (status.value === 'running') return
  progress.value = 0
  status.value = 'running'
  work = setInterval(() => {
    progress.value += .14
    if (progress.value >= (shouldFail ? .58 : 1)) {
      progress.value = Math.min(progress.value, 1)
      status.value = shouldFail ? 'error' : 'success'
      clearInterval(work)
    }
  }, 210)
}

function authenticate(provider: NativeSocialProvider) {
  if (social.value === 'loading') return
  social.value = 'loading'
  account.value = provider
  output.value = ''
  login = setTimeout(() => {
    social.value = 'error'
    output.value = '演示连接超时，可以重试。'
  }, 1350)
}

onBeforeUnmount(() => { clearInterval(work); clearTimeout(login) })
</script>

<template>
  <StackLayout v-if="id === 'NP.fab'">
    <SNativeToggleButton v-model:selected="blurred" label="模糊遮罩" size="sm" />
    <SNativeSurface tone="muted" :padding="6" marginTop="8">
      <GridLayout height="180">
        <SNativeText text="本周归档" verticalAlignment="top" margin="8" />
        <SNativeFAB label="新增操作" :actions="items" :backdrop="blurred ? 'blur' : 'transparent'" v-model:open="open"
          @action="item => output = item.label" />
      </GridLayout>
    </SNativeSurface>
    <SNativeFAB label="创建草稿" position="bottom-start" size="sm" @tap="output = '已创建草稿'" />
    <SNativeMotionText :value="output" announce />
  </StackLayout>

  <StackLayout v-else-if="id === 'NP.morph-button'">
    <SNativeToggleButton v-model:selected="rightToLeft" label="从右到左" size="sm" />
    <SNativeButton label="切换展开方向" variant="ghost" size="sm" @tap="corner = corner === 'bottom-end' ? 'top-start' : 'bottom-end'" />
    <SNativeProvider :direction="rightToLeft ? 'rtl' : 'ltr'">
      <SNativeSurface tone="muted" :padding="12" marginTop="6">
        <SNativeMorphButton label="编辑交付设置" title="交付设置" :width="238" :direction="corner" closeLabel="关闭设置">
          <template #default="{ close }">
            <StackLayout>
              <SNativeToggleButton v-model:selected="signature" label="请求签名" size="sm" fullWidth />
              <SNativeButton label="保存设置" size="sm" marginTop="6" @tap="output = '已保存设置'; close('confirm')" />
            </StackLayout>
          </template>
        </SNativeMorphButton>
      </SNativeSurface>
    </SNativeProvider>
    <SNativeMotionText :value="output" announce marginTop="6" />
  </StackLayout>

  <StackLayout v-else-if="id === 'NP.progress-button'">
    <SNativeProgressButton v-model:completed="hold" label="按住完成校对" workingLabel="正在确认" successLabel="校对完成"
      hint="按住按钮完成，或通过辅助操作直接确认" :holdDuration="1250" autoReset
      @complete="output = '已完成校对'" @cancel="output = '确认已取消'" />
    <SNativeProgressButton label="导出交付记录" workingLabel="正在导出" successLabel="导出完成" errorLabel="导出失败，点按重试"
      marginTop="8" :status="status" :progress="progress" locale="zh-CN" @retry="simulate(false)" />
    <GridLayout columns="*,*" marginTop="5">
      <SNativeButton col="0" label="演示导出" variant="secondary" size="sm" :disabled="status === 'running'" fullWidth @tap="simulate(false)" />
      <SNativeButton col="1" label="演示失败" variant="ghost" size="sm" :disabled="status === 'running'" fullWidth @tap="simulate(true)" />
    </GridLayout>
    <SNativeMotionText :value="output" announce />
  </StackLayout>

  <StackLayout v-else-if="id === 'NP.slide-button'">
    <SNativeToggleButton v-model:selected="rightToLeft" label="从右到左" size="sm" marginBottom="8" />
    <SNativeProvider :direction="rightToLeft ? 'rtl' : 'ltr'">
      <SNativeSlideButton v-model:completed="slide" label="滑动确认归档" completeLabel="已归档" variant="danger" :completionThreshold="0.82"
        hint="将滑块移向另一侧并松手，或通过辅助操作直接确认" locale="zh-CN"
        @complete="output = '已确认归档'" @cancel="output = '滑动已取消'" />
    </SNativeProvider>
    <SNativeButton label="重置示例" variant="secondary" size="sm" marginTop="8" @tap="slide = false; output = ''" />
    <SNativeMotionText :value="output" announce />
  </StackLayout>

  <StackLayout v-else-if="id === 'NP.social-auth-button'">
    <SNativeSocialAuthButton provider="apple" label="使用 Apple 登录" loadingLabel="正在连接 Apple" errorLabel="重试 Apple"
      :status="account === 'apple' ? social : 'ready'" :disabled="social === 'loading' && account !== 'apple'" @authenticate="authenticate" fullWidth />
    <SNativeSocialAuthButton provider="github" label="使用 GitHub 登录" loadingLabel="正在连接 GitHub" errorLabel="重试 GitHub"
      marginTop="6" :status="account === 'github' ? social : 'ready'" :disabled="social === 'loading' && account !== 'github'"
      @authenticate="authenticate" fullWidth />
    <SNativeSocialAuthButton provider="google" label="使用 Google 登录" size="sm" marginTop="6" disabled />
    <SNativeMotionText :value="output" announce marginTop="5" />
  </StackLayout>

  <StackLayout v-else-if="id === 'NP.toggle-button'">
    <SNativeToggleButton v-model:selected="signature" label="显示签名状态" />
    <SNativeToggleButton label="保留旧版材料" variant="ghost" size="sm" marginTop="6" defaultSelected />
    <SNativeToggleButton label="保留发布标签" size="sm" marginTop="6" disabled />
    <SNativeMotionText :value="signature ? '正在显示签名状态' : '已隐藏签名状态'" announce marginTop="8" />
  </StackLayout>

  <StackLayout v-else-if="id === 'NP.toggle-button-group'">
    <SNativeToggleButtonGroup v-model:selected="single" label="交付日期" :items="filterOptions" size="sm" fullWidth :allowEmpty="false" />
    <SNativeToggleButtonGroup v-model:selected="multiple" label="交付格式" :items="formats" orientation="vertical"
      size="sm" selectionMode="multiple" marginTop="12" detached />
    <SNativeMotionText :value="`已选 ${multiple.length} 种格式`" :reserve="10" announce marginTop="8" />
  </StackLayout>
</template>
