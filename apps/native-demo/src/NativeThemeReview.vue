<script setup lang="ts">
import { ref, shallowRef } from 'nativescript-vue'
import {
  createNativeTheme, SNativeButton, SNativeProgressBar, SNativeProvider, SNativeSurface, SNativeText, SNativeTextArea, type NativeProviderOptions,
} from '@syntrofic/ui-native'
const input = ref(JSON.stringify({
  light:{appearance:'light',fontFamily:'system',colors:{accent:'#51647c',surface:'#e5e9ec'},geometry:{radiusMd:20}},
  dark:{appearance:'dark',colors:{accent:'#b4c6e0',surface:'#303840'},geometry:{radiusMd:20}},
},null,2))
const options = shallowRef<NativeProviderOptions>({})
const selected = ref<'light'|'dark'>('light')
const result = ref('')
function apply(mode: 'light'|'dark') {
  try {
    const data=JSON.parse(input.value)
    const set=data[mode]
    if (!set || typeof set !== 'object') throw new Error()
    const base=createNativeTheme(mode)
    const colors=Object.fromEntries(Object.entries(set.colors ?? {}).filter(([key,value]) =>
      Object.hasOwn(base.colors,key) && typeof value==='string' && /^#[0-9a-f]{6}$/i.test(value)))
    const geometry=Object.fromEntries(Object.entries(set.geometry ?? {}).filter(([key,value]) =>
      Object.hasOwn(base.geometry,key) && typeof value==='number' && Number.isFinite(value) && value>=0 && value<=90))
    options.value={ appearance:mode, colors, geometry, fontFamily:typeof set.fontFamily==='string' ? set.fontFamily.slice(0,100) : undefined }
    selected.value=mode
    result.value='已应用主题'
  } catch { result.value='主题 JSON 无法读取' }
}
</script>
<template>
  <Page>
    <ActionBar title="348 原生主题预览" />
    <SNativeProvider v-bind="options">
      <ScrollView>
        <StackLayout padding="13">
          <GridLayout columns="*,*" marginBottom="6">
            <SNativeButton label="应用浅色" size="sm" variant="secondary" :pressed="selected==='light'" @tap="apply('light')" marginRight="3" />
            <SNativeButton col="1" label="应用深色" size="sm" variant="secondary" :pressed="selected==='dark'" @tap="apply('dark')" marginLeft="3" />
          </GridLayout>
          <SNativeSurface :padding="10" marginBottom="6">
            <SNativeText text="品牌组件预览" heading size="title" />
            <SNativeProgressBar :value="62" label="复核进度" marginTop="6" />
          </SNativeSurface>
          <SNativeTextArea v-model="input" label="导出的 Native 主题" :rows="5" />
          <SNativeText v-if="result" :text="result" marginTop="6" />
        </StackLayout>
      </ScrollView>
    </SNativeProvider>
  </Page>
</template>
