<script setup lang="ts">
import { onBeforeUnmount, ref, shallowRef } from 'vue'
import { SButton, SLogStream, type LogEntry, type LogMessageEntry } from '../src'
import bundledArchive from './assets/build-log-archive.json'
import archive from './assets/build-log-archive.json?url&no-inline'

const initial = ([
  { id: 'config', level: 'debug', source: 'cli', text: '已读取项目配置' },
  { id: 'tokens', level: 'info', source: 'theme', text: '已同步语义颜色和间距' },
  { id: 'manifest', level: 'info', source: 'catalog', text: '已读取组件目录' },
  { id: 'types', level: 'info', source: 'types', text: '类型检查通过' },
  { id: 'assets', level: 'info', source: 'assets', text: '已检查本地字体资源' },
  { id: 'entry', level: 'debug', source: 'build', text: '已生成 Vue 入口' },
  { id: 'native', level: 'debug', source: 'build', text: '已生成 Native 入口' },
  { id: 'docs', level: 'info', source: 'docs', text: '已生成组件文档' },
  { id: 'templates', level: 'info', source: 'docs', text: '已生成页面模板' },
  { id: 'contrast', level: 'info', source: 'visual', text: '已检查浅色模式对比度' },
  { id: 'review', level: 'warning', source: 'visual', text: '3 个组件等待视觉评审', detail: '检查项\n  日期范围选择器\n  消息引用\n  三维图表' },
  { id: 'snapshot', level: 'info', source: 'visual', text: '已保存组件截图' },
  { id: 'output', level: 'info', source: 'build', text: '已生成静态资源' },
  { id: 'finish', level: 'info', source: 'build', text: '构建步骤已完成' },
] satisfies LogEntry[]).map((entry, index) => ({ ...entry, timestamp: `09:41:${String(index + 1).padStart(2, '0')}` }))

const logs = shallowRef<readonly (LogEntry | LogMessageEntry)[]>(initial)
const terminal = ref(false)
const timestamps = ref(true)
const loading = ref(false)
const error = ref('')
let request: AbortController | undefined
let eventNumber = 0

function append() {
  if (request) return
  eventNumber++
  const time = new Date().toLocaleTimeString('zh-CN', { hour12: false })
  logs.value = [...logs.value, { id: `live-${eventNumber}`, level: 'info', timestamp: time, source: 'verify', message: `组件检查通过 #${eventNumber}` }]
}

async function readArchive() {
  if (request) return
  const controller = new AbortController()
  request = controller
  loading.value = true
  error.value = ''
  try {
    let entries: unknown = bundledArchive
    if (import.meta.env.MODE !== 'theme-sheet') {
      const response = await fetch(archive, { signal: controller.signal })
      if (!response.ok) throw new Error('Unable to load build log')
      entries = await response.json()
    }
    if (!Array.isArray(entries) || !entries.every(entry => entry && typeof entry.id === 'string' && typeof entry.message === 'string')) {
      throw new Error('Invalid build log')
    }
    if (!controller.signal.aborted) logs.value = entries
  } catch {
    if (!controller.signal.aborted) error.value = '构建日志加载失败。'
  } finally {
    if (request === controller) {
      request = undefined
      loading.value = false
    }
  }
}

function clear() {
  request?.abort()
  request = undefined
  loading.value = false
  error.value = ''
  logs.value = []
}

onBeforeUnmount(() => request?.abort())
</script>

<template>
  <div class="review__row">
    <SButton size="sm" :aria-disabled="loading || undefined" @click="append">追加日志</SButton>
    <SButton size="sm" variant="secondary" :aria-pressed="terminal" @click="terminal = !terminal">终端视图</SButton>
    <SButton size="sm" variant="secondary" :aria-pressed="!timestamps" @click="timestamps = !timestamps">隐藏时间</SButton>
    <SButton size="sm" variant="secondary" :aria-disabled="loading || undefined" @click="readArchive">加载构建记录</SButton>
    <SButton size="sm" variant="ghost" @click="clear">清空日志</SButton>
  </div>
  <SLogStream :entries="logs" :max-entries="14" :has-timestamps="timestamps" :variant="terminal ? 'terminal' : 'default'" label="构建日志"
    follow-label="跟随最新日志" pause-label="暂停跟随" jump-label="跳转到最新日志" empty-text="暂无构建日志"
    :loading="loading" loading-text="正在加载构建日志" :error="error" :retry="readArchive" retry-label="重试加载构建日志" />
</template>
