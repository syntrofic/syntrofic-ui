<script setup lang="ts">
import { computed, ref, shallowRef } from 'vue'
import makeQRCode from 'qrcode-generator'
import {
  SButton, SInput, SProgressBar, SRating, SSwitch, STextArea, applyBrandPatch, brandColors, brandPartTargets, brandThemeStyle,
  brandThemeSuggestions, createBrandTheme, exportBrandTheme,
  type BrandChange, type BrandColor, type BrandMode, type BrandPart, type BrandPreset, type BrandTheme,
} from '../src'

const props = defineProps<{ heading?: string }>()
const storeKey = 'syntrofic-theme-projects-v1'
function load(): BrandTheme[] {
  try { return JSON.parse(localStorage.getItem(storeKey) ?? '[]') as BrandTheme[] }
  catch { return [] }
}
const list = shallowRef<BrandTheme[]>(load())
const current = shallowRef<BrandTheme>(list.value[0] ?? createBrandTheme())
const version = ref<number | undefined>(list.value[0]?.revision)
const mode = ref<BrandMode>('light')
const preset = ref<BrandPreset>('morandi')
const part = ref<BrandPart>('button-primary')
const partLabels: Record<BrandPart, string> = {
  'button-primary': '主要按钮', 'button-secondary': '次级按钮', 'button-ghost': '文字按钮', 'button-danger': '危险按钮',
  card: '卡片', field: '字段', dialog: '对话框', badge: '徽章', tooltip: '工具提示', popover: '浮层',
}
const asset = ref('')
const assetName = ref('')
const license = ref('')
const phoneHost = ref(typeof location === 'undefined' ? '' : location.origin + location.pathname)
const agentJSON = ref('')
const endpoint = ref('http://127.0.0.1:4481')
const token = ref('')
const phoneLink = computed(() => {
  try {
    const link = new URL(phoneHost.value)
    if (!['http:', 'https:'].includes(link.protocol) || link.username || link.password) return ''
    link.search = ''
    link.searchParams.set('theme-preview','1')
    link.searchParams.set('theme',mode.value)
    link.searchParams.set('radius',String(current.value.radius))
    for (const [key,value] of Object.entries(current.value.modes[mode.value])) if (value) link.searchParams.set(key,value)
    return link.href
  } catch { return '' }
})
const phoneQR = computed(() => {
  try {
    if (!phoneLink.value) return ''
    const qr = makeQRCode(0, 'M')
    qr.addData(phoneLink.value)
    qr.make()
    return qr.createDataURL(3, 10)
  } catch { return '' }
})
function applyAgentPatch() {
  try {
    const value = JSON.parse(agentJSON.value)
    if (!value || value.revision !== current.value.revision || !Array.isArray(value.changes) || value.changes.length > 60)
      throw new Error('建议的修订与当前草稿不一致')
    patch(value.changes as BrandChange[])
  } catch (error) { message.value = error instanceof Error ? error.message : '无法应用建议' }
}
async function saveShared() {
  try {
    const url = new URL('/snapshots',endpoint.value)
    if (!(url.protocol === 'https:' || url.protocol === 'http:' && ['127.0.0.1','localhost'].includes(url.hostname)) || url.username || url.password || !token.value)
      throw new Error('需要有效的工作区地址和令牌')
    const response = await fetch(url, {method:'POST',headers:{'Content-Type':'application/json',authorization:'Bearer '+token.value},
      body:JSON.stringify({ id: current.value.id+'-v'+current.value.revision, files: exported.value }),
      redirect:'error',signal:AbortSignal.timeout(5000)})
    if (!response.ok) throw new Error('保存共享修订失败')
    message.value = '已把版本保存到授权工作区'
  } catch (error) { message.value = error instanceof Error ? error.message : '保存共享修订失败' }
}

const previewPart = computed(() => {
  const item = current.value.parts['button-primary']
  return item ? { background: item.background, color: item.foreground, borderRadius: item.radius === undefined ? undefined : item.radius + 'px' } : {}
})
const imports = ref('')
const url = ref('')
const message = ref('')
const previewRating = ref(3.5)
const progress = ref(62)
const back = shallowRef<BrandTheme[]>([])
const forward = shallowRef<BrandTheme[]>([])
const exported = computed(() => exportBrandTheme(current.value))
const previewStyle = computed(() => brandThemeStyle(current.value, mode.value))
const suggestions = computed(() => brandThemeSuggestions(imports.value, mode.value))
const shortColors = ['canvas', 'surface', 'text', 'accent', 'accent-on', 'border', 'focus', 'danger'] as const
const baseColors: Record<BrandMode, string[]> = {
  light: ['#ffffff', '#f6f5f3', '#2b302b', '#425849', '#fffdf9', '#dcd9d0', '#546a61', '#794f50'],
  dark: ['#1d1e1b', '#2a2825', '#f2ede6', '#a8bda9', '#1c2e22', '#494b42', '#bccfc5', '#deb0a8'],
}
function colors(key: BrandColor, index: number) { return current.value.modes[mode.value][key] ?? baseColors[mode.value][index] ?? '#888888' }
function save() {
  try {
    const all = load()
    if (all.find(theme => theme.id === current.value.id)?.revision !== version.value) throw new Error('此主题有新的修订，请重新打开。')
    const next = [current.value, ...all.filter(theme => theme.id !== current.value.id)]
    localStorage.setItem(storeKey, JSON.stringify(next))
    list.value = next
    version.value = current.value.revision
    return true
  } catch (error) {
    message.value = error instanceof Error ? error.message : '主题保存失败'
    return false
  }
}
function patch(changes: readonly BrandChange[]) {
  const previous = current.value
  try {
    current.value = applyBrandPatch(previous, { revision: previous.revision, changes })
    back.value = [...back.value.slice(-30), previous]
    forward.value = []
    if (save()) message.value = '已保存修订 ' + current.value.revision
  } catch (error) { message.value = error instanceof Error ? error.message : '主题更新失败' }
}
function switchProject(id: string) {
  const next = load().find(theme => theme.id === id)
  if (!next) return
  current.value = next
  version.value = next.revision
  back.value = []
  forward.value = []
}
function fresh(copy = false) {
  const id = 'theme-' + crypto.randomUUID().slice(0, 8)
  current.value = copy ? { ...current.value, id, name: current.value.name + ' 副本', revision: 0 } : createBrandTheme(id, '新品牌', preset.value)
  version.value = undefined
  back.value = []
  forward.value = []
  save()
}
function history(direction: 'undo' | 'redo') {
  const from = direction === 'undo' ? back : forward
  const to = direction === 'undo' ? forward : back
  const next = from.value.at(-1)
  if (!next) return
  to.value = [...to.value, current.value]
  from.value = from.value.slice(0, -1)
  current.value = { ...next, revision: current.value.revision + 1 }
  if (save()) message.value = '已保存修订 ' + current.value.revision
}
async function importSource() {
  try {
    const source = new URL(url.value)
    if (source.protocol !== 'https:' || source.username || source.password) throw new Error('请输入 HTTPS 地址')
    const response = await fetch(source, { credentials: 'omit', redirect: 'error', signal: AbortSignal.timeout(7000) })
    if (!response.ok) throw new Error('来源无法读取')
    imports.value = (await response.text()).slice(0, 200000)
    message.value = '已读取素材，可检查后应用'
  } catch { message.value = '无法直接读取网站，可以粘贴当页样式。' }
}
function addAsset() {
  if (!asset.value || !assetName.value) return
  patch([{ type: 'settings', value: { assets: [...current.value.assets, { label: assetName.value, url: asset.value, license: license.value || undefined }] } }])
  asset.value = ''
  assetName.value = ''
  license.value = ''
}
function download(file: keyof ReturnType<typeof exportBrandTheme>) {
  const link = document.createElement('a')
  link.href = URL.createObjectURL(new Blob([exported.value[file]], { type: 'text/plain;charset=utf-8' }))
  link.download = file
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(link.href), 1000)
}
</script>

<template>
  <div class="theme-workspace">
    <header><h2>{{ props.heading ?? '品牌主题工作台' }}</h2>
      <div class="sy-agent-actions">
        <label>主题 <select :value="current.id" @change="switchProject(($event.target as HTMLSelectElement).value)">
          <option :value="current.id">{{ current.name }}</option>
          <option v-for="theme in list.filter(theme => theme.id !== current.id)" :key="theme.id" :value="theme.id">{{ theme.name }}</option>
        </select></label>
        <label>配色 <select v-model="preset"><option value="morandi">莫兰迪</option><option value="slate">岩灰</option><option value="mist">雾蓝</option><option value="clay">暖陶</option></select></label>
        <SButton size="sm" variant="secondary" @click="fresh()">新建</SButton>
        <SButton size="sm" variant="secondary" @click="fresh(true)">复制</SButton>
        <SButton size="sm" variant="ghost" :disabled="!back.length" @click="history('undo')">撤销</SButton>
        <SButton size="sm" variant="ghost" :disabled="!forward.length" @click="history('redo')">重做</SButton>
      </div>
    </header>
    <div class="theme-workspace__grid">
      <section class="sy-agent-card">
        <SSwitch :model-value="mode === 'dark'" @update:model-value="mode = $event ? 'dark' : 'light'">深色预览</SSwitch>
        <label>名称 <input :value="current.name" @change="patch([{ type:'settings', value:{ name: ($event.target as HTMLInputElement).value } }])"></label>
        <label>字体 <input :value="current.font" @change="patch([{ type:'settings', value:{ font: ($event.target as HTMLInputElement).value } }])"></label>
        <div class="theme-workspace__colors">
          <label v-for="(key, index) in shortColors" :key="key"><input type="color" :value="colors(key, index)"
            @change="patch([{ type:'color', mode, key, value: ($event.target as HTMLInputElement).value }])">{{ key }}</label>
        </div>
        <label v-for="setting in (['radius','spacing','fontSize','borderWidth'] as const)" :key="setting">
          {{ { radius:'圆角', spacing:'间距', fontSize:'字号', borderWidth:'边框' }[setting] }}
          <input type="number" :value="current[setting]" @change="patch([{ type:'settings', value:{ [setting]: Number(($event.target as HTMLInputElement).value) } }])">
        </label>
        <label>品牌语气 <textarea :value="current.voice" rows="2" @change="patch([{ type:'settings', value:{ voice: ($event.target as HTMLTextAreaElement).value } }])" /></label>
        <details><summary>全部语义颜色</summary>
          <label v-for="key in brandColors.filter(key => !shortColors.some(value => value === key))" :key="key">
            {{ key }} <input type="color" :value="colors(key, -1)" @change="patch([{type:'color',mode,key,value:($event.target as HTMLInputElement).value}])">
          </label>
        </details>
      </section>
      <section class="sy-agent-card" :data-sy-theme="mode" :data-sy-brand="current.id" :style="previewStyle">
        <h3>组件预览</h3>
        <SInput label="项目名称" model-value="交付工作台" />
        <SProgressBar :value="progress" label="归档进度" />
        <SRating v-model="previewRating" label="材料评分" :step=".5" />
        <SButton size="sm" :style="previewPart" @click="progress = progress === 62 ? 84 : 62">更新进度</SButton>
        <div class="sy-agent-actions">
          <SButton v-for="(_, file) in exported" :key="file" variant="secondary" size="sm" @click="download(file)">{{ file }}</SButton>
        </div>
      </section>
    </div>
    <section class="sy-agent-card">
      <div class="sy-agent-actions"><SInput v-model="url" label="品牌网站" type="url" /><SButton variant="secondary" size="sm" @click="importSource">读取样式</SButton></div>
      <STextArea v-model="imports" label="样式来源" :rows="3" />
      <p v-if="suggestions.length">{{ suggestions.map(change => change.type === 'color' ? change.key + ' ' + change.value : change.type).join(' · ') }}</p>
      <SButton variant="secondary" size="sm" :disabled="!suggestions.length" @click="patch(suggestions)">应用颜色建议</SButton>
    </section>
    <section class="sy-agent-card">
      <h3>组件覆盖</h3>
      <label>部件 <select v-model="part"><option v-for="(_, key) in brandPartTargets" :key="key" :value="key">{{ partLabels[key] }}</option></select></label>
      <label>圆角 <input type="number" :value="current.parts[part]?.radius ?? current.radius"
        @change="patch([{ type:'part', key:part, value:{ ...current.parts[part], radius: Number(($event.target as HTMLInputElement).value) } }])"></label>
      <label>底色 <input type="color" :value="current.parts[part]?.background ?? colors('accent', 3)"
        @change="patch([{ type:'part', key:part, value:{ ...current.parts[part], background: ($event.target as HTMLInputElement).value } }])"></label>
      <SSwitch :model-value="current.shadow === 'soft'" @update:model-value="patch([{ type:'settings',value:{ shadow: $event ? 'soft' : 'none' } }])">浅层阴影</SSwitch>
    </section>
    <section class="sy-agent-card">
      <h3>品牌资产</h3>
      <div class="sy-agent-actions"><SInput label="名称" v-model="assetName" /><SInput label="资源地址" type="url" v-model="asset" /><SInput label="授权信息" v-model="license" />
        <SButton size="sm" variant="secondary" :disabled="!asset || !assetName" @click="addAsset">添加资产</SButton></div>
      <div v-for="(item, index) in current.assets" :key="index" class="sy-agent-actions">
        <a :href="item.url" rel="noreferrer">{{ item.label }}</a><small>{{ item.license }}</small>
        <SButton variant="ghost" size="sm" @click="patch([{ type:'settings', value:{ assets: current.assets.filter((_, i) => i !== index) } }])">移除</SButton>
      </div>
    </section>
    <section class="sy-agent-card">
      <h3>手机验收</h3>
      <SInput label="手机可访问的预览地址" v-model="phoneHost" />
      <a v-if="phoneLink" :href="phoneLink" target="_blank" rel="noreferrer">打开手机主题</a>
      <img v-if="phoneQR" :src="phoneQR" alt="手机主题预览二维码" width="138" height="138">
    </section>
    <section class="sy-agent-card">
      <h3>编辑代理</h3>
      <p>当前草稿修订 {{ current.revision }}</p>
      <STextArea label="建议 JSON" v-model="agentJSON" :rows="3" />
      <div class="sy-agent-actions">
        <SButton size="sm" variant="secondary" @click="download('manifest.json')">导出当前草稿</SButton>
        <SButton size="sm" variant="secondary" :disabled="!agentJSON" @click="applyAgentPatch">应用建议</SButton>
      </div>
    </section>
    <section class="sy-agent-card">
      <h3>保存共享主题</h3>
      <code>syntrofic figma --id &lt;开发插件 ID&gt; --out ./figma-plugin</code>
      <div class="sy-agent-actions"><SInput label="工作区地址" v-model="endpoint" /><SInput label="授权令牌" v-model="token" type="password" />
        <SButton variant="secondary" size="sm" :disabled="!token" @click="saveShared">保存共享修订</SButton></div>
    </section>
    <p v-if="message" role="status">{{ message }}</p>
  </div>
</template>

<style scoped>
.theme-workspace, .theme-workspace__grid { display: grid; gap: 1rem; }
.theme-workspace__grid { grid-template-columns: repeat(auto-fit, minmax(min(100%, 18rem), 1fr)); }
.theme-workspace__colors { display: grid; grid-template-columns: repeat(auto-fit, minmax(7rem, 1fr)); gap: .5rem; }
.theme-workspace label { display: flex; align-items: center; gap: .5rem; }
.theme-workspace input[type='number'] { width: 5.5rem; }
.theme-workspace input[type='color'] { width: 2.5rem; }
.theme-workspace [data-sy-brand] { background: var(--sy-canvas); color: var(--sy-text); border-radius: var(--sy-radius-md) / calc(var(--sy-radius-md) * .78); font: var(--sy-font-size)/1.5 var(--sy-font); box-shadow: var(--sy-shadow); }
</style>
