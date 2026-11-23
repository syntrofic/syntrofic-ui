<script setup lang="ts">
import { computed, onBeforeUnmount, ref, shallowRef } from 'vue'
import {
  SAgentUI, SButton, SMotionText, SProgressBar, SSelect, STextArea, applyBrandPatch,
  brandThemeStyle, createBrandTheme, exportWorkspace, generateWorkspace,
  type AgentDocument, type BrandPreset, type BrandTheme, type BuilderRevision,
} from '../src'
import { reviewAgentNode } from './agent-review'
const key = 'syntrofic-builder-v1'
function load(): BuilderRevision[] { try { return JSON.parse(localStorage.getItem(key) ?? '[]') as BuilderRevision[] } catch { return [] } }
const history = shallowRef<BuilderRevision[]>(load())
const current = shallowRef<BuilderRevision | undefined>(history.value[0])
const theme = shallowRef<BrandTheme>(current.value?.theme ?? createBrandTheme('builder'))
const prompt = ref('制作一个工作台，显示本周交付指标、归档走势和待处理列表。')
const palette = ref<BrandPreset>('morandi')
function brands(): BrandTheme[] {
  try { return JSON.parse(localStorage.getItem('syntrofic-theme-projects-v1') ?? '[]') as BrandTheme[] }
  catch { return [] }
}
const brandList = shallowRef(brands())
const brandId = ref('')
function syncBrand() {
  brandList.value = brands()
  const selected = brandList.value.find(item => item.id === brandId.value)
  if (selected) { theme.value = selected; state.value = '已同步主题修订 ' + selected.revision }
}
const state = ref('')
const progress = ref(0)
const mode = ref<'light'|'dark'>('light')
const job = shallowRef<AbortController>()
const files = computed(() => current.value ? exportWorkspace(current.value) : undefined)
const css = computed(() => brandThemeStyle(current.value?.theme ?? theme.value, mode.value))
const select = (id: string) => { current.value = history.value.find(item => item.id === id) }
function changePreset() { theme.value = createBrandTheme('builder', '工作台', palette.value) }
function revise(event: Event) {
  theme.value = applyBrandPatch(theme.value, { revision: theme.value.revision,
    changes: [{ type:'color', mode:'light', key:'accent', value:(event.target as HTMLInputElement).value }] })
}
async function delay(signal?: AbortSignal) {
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => { signal?.removeEventListener('abort', cancel); resolve() }, 250)
    function cancel() { clearTimeout(timer); reject(signal?.reason) }
    if (signal?.aborted) cancel()
    else signal?.addEventListener('abort',cancel,{once:true})
  })
}
async function generate() {
  if (job.value) return
  const next = new AbortController()
  job.value = next
  try {
    const answer = await generateWorkspace({ prompt: prompt.value, theme:theme.value, signal:next.signal, report(phase) {
      state.value = { planning:'整理需求', rendering:'生成界面', validating:'检查文档' }[phase]
      progress.value = { planning:20, rendering:62, validating:90 }[phase]
    } }, async request => {
      await delay(request.signal)
      request.report?.('rendering')
      const text = request.prompt
      const kinds = [
        ...(/指标|数据|报表|KPI/.test(text) ? ['kpi-grid'] as const : []),
        ...(/图|走势|趋势/.test(text) ? ['line-chart'] as const : []),
        ...(/表单|填写|录入/.test(text) ? ['form'] as const : []),
        ...(/列表|表格|清单|待处理/.test(text) ? ['data-table'] as const : []),
      ]
      await delay(request.signal)
      return { version:1, nodes: [{ id:'generated', kind:'dashboard', title:'工作台',
        children: kinds.length ? kinds.map(reviewAgentNode) : [{ id:'overview', kind:'card', title:'界面摘要', text: text.slice(0,180) }] }] } satisfies AgentDocument
    })
    current.value = answer
    history.value = [answer, ...history.value].slice(0,18)
    localStorage.setItem(key, JSON.stringify(history.value))
    progress.value=100
    state.value='已生成并保存'
  } catch (error) {
    state.value = next.signal.aborted ? '已停止生成' : error instanceof Error ? error.message : '生成失败'
  } finally { if (job.value === next) job.value=undefined }
}
function download(name: string) {
  const content = files.value?.[name as keyof NonNullable<typeof files.value>]
  if (!content) return
  const url=URL.createObjectURL(new Blob([content],{type:'text/plain;charset=utf-8'}))
  const anchor=document.createElement('a')
  anchor.href=url
  anchor.download=name.replace(/^.*\//,'')
  anchor.click()
  setTimeout(()=>URL.revokeObjectURL(url),1200)
}
onBeforeUnmount(() => job.value?.abort())
</script>

<template>
  <div class="sy-agent-section">
    <STextArea v-model="prompt" label="描述要创建的界面" :rows="3" />
    <div class="sy-agent-actions">
      <SSelect v-model="palette" label="主题预设" :options="[{label:'莫兰迪',value:'morandi'},{label:'岩灰',value:'slate'},{label:'雾蓝',value:'mist'},{label:'暖陶',value:'clay'}]" @update:model-value="changePreset" />
      <label>修改主色 <input type="color" :value="theme.modes.light.accent" @change="revise"></label>
      <SButton size="sm" :loading="Boolean(job)" @click="generate">生成界面</SButton>
      <SButton size="sm" variant="ghost" :disabled="!job" @click="job?.abort()">停止</SButton>
    </div>
    <div v-if="brandList.length" class="sy-agent-actions">
      <label>保存的品牌 <select v-model="brandId"><option value="">选择主题</option>
        <option v-for="brand in brandList" :key="brand.id" :value="brand.id">{{ brand.name }} · {{ brand.revision }}</option></select></label>
      <SButton size="sm" variant="secondary" :disabled="!brandId" @click="syncBrand">同步最新修订</SButton>
    </div>
    <SProgressBar :value="progress"  label="生成进度" />
    <SMotionText v-if="state" :value="state" announce />
    <template v-if="current">
      <div class="sy-agent-actions">
        <label>生成版本 <select :value="current.id" @change="select(($event.target as HTMLSelectElement).value)">
          <option v-for="revision in history" :key="revision.id" :value="revision.id">{{ revision.prompt.slice(0,26) }} · {{ revision.createdAt.slice(11,19) }}</option>
        </select></label>
        <SButton size="sm" variant="ghost" @click="mode = mode === 'light' ? 'dark' : 'light'">切换浅深色</SButton>
      </div>
      <section class="sy-agent-card" :data-sy-theme="mode" :style="css">
        <SAgentUI :document="current.document" />
      </section>
      <div v-if="files" class="sy-agent-actions">
        <SButton v-for="(_, name) in files" :key="name" size="sm" variant="secondary" @click="download(name)">{{ name }}</SButton>
      </div>
    </template>
  </div>
</template>
