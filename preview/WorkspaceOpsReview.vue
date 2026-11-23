<script setup lang="ts">
import { ref } from 'vue'
import { SButton, SInput } from '../src'
const props = defineProps<{ mode: 'usage' | 'approval' | 'exports' }>()
const endpoint = ref('http://127.0.0.1:4481')
const identity = ref('')
const title = ref('新的复核记录')
const result = ref('')
const key = ref('')
let busy = false
async function call(path: string, data?: Record<string, unknown>) {
  if (busy) return
  busy = true
  try {
    const url = new URL(path, endpoint.value)
    const local = url.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(url.hostname)
    if (!identity.value || !(url.protocol === 'https:' || local) || url.username || url.password) throw new Error('填写服务地址和工作区令牌')
    const reply = await fetch(url, { method: data ? 'POST' : 'GET',
      headers: { Authorization: 'Bearer ' + identity.value, ...(data && { 'Content-Type': 'application/json' }) },
      redirect: 'error', signal: AbortSignal.timeout(5000), body: data && JSON.stringify(data) })
    const output = await reply.json()
    if (!reply.ok) throw new Error(output.error ?? '请求失败')
    result.value = JSON.stringify(output, null, 2)
    if (output.id || output.key) key.value = output.id ?? output.key
  } catch (error) { result.value = error instanceof Error ? error.message : '请求失败' }
  finally { busy = false }
}
const request = () => crypto.randomUUID()
function submit() {
  if (props.mode === 'approval') void call('/actions',{ tool:'save_record', key:request(),input:{ id:request(), title:title.value } })
  if (props.mode === 'exports') void call('/snapshots')
  if (props.mode === 'usage') void call('/usage/claim',{ id:request(), units:1 })
}
</script>
<template>
  <section class="sy-agent-card">
    <SInput label="服务地址" v-model="endpoint" />
    <SInput label="工作区令牌" v-model="identity" type="password" />
    <SInput v-if="mode === 'approval'" label="记录标题" v-model="title" />
    <div class="sy-agent-actions">
      <SButton size="sm" @click="submit">{{ mode === 'approval' ? '提交审批' : mode === 'usage' ? '预留额度' : '读取快照清单' }}</SButton>
      <SButton v-if="mode === 'approval'" size="sm" variant="secondary" :disabled="!key" @click="call('/actions/decide',{id:key,accepted:true})">批准</SButton>
      <SButton v-if="mode === 'approval'" size="sm" variant="secondary" :disabled="!key" @click="call('/actions/decide',{id:key,accepted:false})">拒绝</SButton>
      <SButton v-if="mode === 'approval'" size="sm" variant="ghost" @click="call('/audit')">审计记录</SButton>
      <SButton v-if="mode === 'usage'" size="sm" variant="secondary" :disabled="!key" @click="call('/usage/settle',{key,outcome:'completed'})">完成结算</SButton>
      <SButton v-if="mode === 'usage'" size="sm" variant="ghost" @click="call('/usage')">查看用量</SButton>
    </div>
    <pre v-if="result" role="status">{{ result }}</pre>
  </section>
</template>
