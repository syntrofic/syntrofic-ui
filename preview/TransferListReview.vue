<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef } from 'vue'
import { SButton, SMotionText, STransferList, STransferListSelector, type TransferItem } from '../src'
import bundledDirectory from './assets/transfer-directory.json'
import source from './assets/transfer-directory.json?url&no-inline'

const directory = shallowRef<readonly TransferItem[]>([])
const inline = ref(['zhou', 'xu'])
const immediate = ref(['zhou'])
const saved = ref(['zhou', 'xu'])
const loading = ref(true)
const error = ref('')
const labels = {
  availableLabel: '团队成员', selectedLabel: '项目成员', addLabel: '加入选中成员', removeLabel: '移出选中成员',
  addItemLabel: '加入', removeItemLabel: '移出', addAllLabel: '加入全部', clearLabel: '清除可移出成员', filterLabel: '筛选成员',
  selectedEmptyText: '还没有项目成员', availableEmptyText: '没有可选成员', noResultsText: '没有匹配的成员',
  reorderLabel: '调整顺序', moveUpLabel: '上移', moveDownLabel: '下移', selectedCountLabel: (count: number) => `已选 ${count} 人`,
}
const savedNames = computed(() => saved.value.map(key => directory.value.find(item => item.id === key)?.label).filter(Boolean).join('、') || '—')
let request: AbortController | undefined
let validation: AbortController | undefined

async function read(signal: AbortSignal, check = false): Promise<readonly TransferItem[]> {
  if (import.meta.env.MODE === 'theme-sheet') return bundledDirectory
  const url = new URL(source, document.baseURI)
  if (check) url.searchParams.set('validate', 'selection')
  const response = await fetch(url, { signal, cache: 'no-store' })
  if (!response.ok) throw new Error('Could not read the member directory')
  const payload = await response.json()
  if (!Array.isArray(payload) || !payload.every(item => item && typeof item.id === 'string' && typeof item.label === 'string')) throw new Error('Invalid member directory')
  return payload
}

async function load() {
  if (request) return
  const active = new AbortController()
  request = active
  loading.value = true
  error.value = ''
  try {
    const options = await read(active.signal)
    if (!active.signal.aborted) directory.value = options
  } catch {
    if (!active.signal.aborted) error.value = '成员目录加载失败。'
  } finally {
    if (request === active) { request = undefined; loading.value = false }
  }
}

async function validate(next: readonly string[]) {
  const active = new AbortController()
  validation = active
  try {
    const options = await read(active.signal, true)
    const keys = new Set(options.map(item => item.id))
    if (!next.includes('zhou') || !next.every(key => keys.has(key))) throw new Error('Invalid project members')
  } finally {
    if (validation === active) validation = undefined
  }
}

onMounted(load)
onBeforeUnmount(() => { request?.abort(); validation?.abort() })
</script>

<template>
  <div class="transfer-review">
    <div class="review__row">
      <SButton size="sm" variant="secondary" :aria-disabled="loading || undefined" @click="load">刷新成员目录</SButton>
    </div>
    <STransferList v-model="inline" v-bind="labels" label="项目成员编组" label-hidden :items="directory" has-select-all has-clear reorderable
      :loading="loading" loading-text="正在读取成员目录" :error="error" :retry="load" retry-label="重试加载成员" />
    <div class="transfer-review__fields">
      <STransferListSelector v-model="immediate" v-bind="labels" label="快捷添加成员" :items="directory" :loading="loading" has-select-all has-clear />
      <STransferListSelector v-model="saved" v-bind="labels" label="编辑项目成员" :items="directory" :loading="loading" commit-behavior="staged"
        has-select-all has-clear reorderable apply-label="应用编组" cancel-label="取消编辑" :change-action="validate" failure-message="编组保存失败，请重试。" />
      <output class="transfer-review__result" aria-label="已保存编组"><SMotionText :value="savedNames" wrap /></output>
    </div>
  </div>
</template>

<style scoped>
.transfer-review { display: grid; gap: var(--sy-space-3); }
.transfer-review__fields { display: grid; gap: var(--sy-space-3); grid-template-columns: repeat(auto-fit, minmax(min(100%, 13rem), 1fr)); }
.transfer-review__result { grid-column: 1 / -1; min-inline-size: 0; color: var(--sy-text-muted); font-size: .85rem; }
</style>
