<script setup lang="ts">
import { ref } from 'vue'
import { SButton, SInput } from '../src'
const props=defineProps<{ mode:'docs'|'install'|'license' }>()
const address=ref('http://127.0.0.1:4483')
const token=ref('')
const search=ref('')
const output=ref('')
async function get(path:string) {
  try {
    const url = new URL(path,address.value)
    if (!token.value || url.username || url.password || !(url.protocol==='https:' || url.protocol==='http:' && ['127.0.0.1','localhost'].includes(url.hostname)))
      throw new Error('填写 Pro 服务地址和凭证')
    const response=await fetch(url,{headers:{authorization:'Bearer '+token.value},redirect:'error',signal:AbortSignal.timeout(5000)})
    if (!response.ok) throw new Error('Pro 访问未授权')
    output.value=JSON.stringify(await response.json(),null,2)
  } catch(error) { output.value=error instanceof Error?error.message:'读取失败' }
}
</script>
<template>
  <section class="sy-agent-card">
    <SInput label="Pro 服务地址" v-model="address" />
    <SInput label="个人访问凭证" type="password" v-model="token" />
    <template v-if="props.mode==='docs'">
      <SInput label="查询组件" v-model="search" />
      <SButton variant="secondary" size="sm" @click="get('/docs?q='+encodeURIComponent(search))">读取授权文档</SButton>
    </template>
    <template v-else-if="props.mode==='install'">
      <pre><code>syntrofic install-pro ui-pro 0.1.0 --ci --dry-run</code></pre>
      <p>在运行环境配置独立的 CI 令牌。版本、归档校验值和本地缓存路径可先行核对。</p>
    </template>
    <SButton v-else size="sm" variant="secondary" @click="get('/license')">查看产品权益与席位</SButton>
    <pre v-if="output" role="status">{{ output }}</pre>
  </section>
</template>
