<script setup lang="ts">
import { ref } from 'vue'
import { SButton, SInput, SMotionText, STextArea } from '../src'
const props=defineProps<{ mode:'connectors'|'mcp'|'models'|'team' }>()
const providers=[
  {id:'gmail',label:'Gmail / Workspace',type:'oauth',configured:false,connected:false},
  {id:'calendar',label:'Google Calendar',type:'oauth',configured:false,connected:false},
  {id:'contacts',label:'Google Contacts',type:'oauth',configured:false,connected:false},
  {id:'plain',label:'Plain',type:'key',configured:false,connected:false},
  {id:'granola',label:'Granola',type:'key',configured:false,connected:false},
  {id:'cal',label:'Cal.com',type:'key',configured:false,connected:false},
]
const entries=ref(providers)
const endpoint=ref('http://127.0.0.1:4481')
const token=ref('')
const providerKey=ref('')
const selection=ref('plain')
const intent=ref('balanced')
const prompt=ref('概述本周的品牌交付进度。')
const output=ref('')
const status=ref('')
const busy=ref(false)
type Model = {intent:string;label:string}
type Release = {platform:string;version:string;changes:string;url:string}
type Team = {members:{subject:string;role:string}[];subscription:{plan?:string;limit?:number;used?:number};shared:{id:string;title:string;status?:string}[]}
const models=ref<Model[]>([])
const releases=ref<Release[]>([])
const snapshot=ref<Team>()
const connectionUrl=ref('')
const link=ref('')
const policies=[['读取条目','允许'],['保存修改','需要确认'],['删除条目','禁止']]
const plans=[['Free',20],['Plus',100],['Pro',500],['Team',2000]]
function go(path:string) {
  const url=new URL(endpoint.value)
  if (url.username||url.password||!(url.protocol==='https:'||url.protocol==='http:'&&['localhost','127.0.0.1'].includes(url.hostname)))
    throw new Error('服务地址需使用 HTTPS 或本机地址')
  return new URL(path,url)
}
async function call(path:string, data?:Record<string,unknown>) {
  if (busy.value) return
  busy.value=true
  status.value=''
  try {
    const response=await fetch(go(path),{method:data?'POST':'GET',redirect:'error',signal:AbortSignal.timeout(33000),
      headers:{Authorization:'Bearer '+token.value,...data&&{'Content-Type':'application/json'}},body:data?JSON.stringify(data):undefined})
    const result=await response.json()
    if (!response.ok) throw new Error(result.error??'请求失败')
    return result
  } catch (error) {status.value=(error as Error).message}
  finally {busy.value=false}
}
async function refresh() {
  if (props.mode==='connectors') {
    const result=await call('/connectors')
    if (result) entries.value=result
  } else if (props.mode==='mcp') {
    const result=await call('/mcp/activity')
    if (result) output.value=JSON.stringify(result,null,2)
  } else if (props.mode==='models') {
    const result=await call('/models')
    if (result) {
      models.value=result.models
      releases.value=result.releases
      intent.value=models.value[0]?.intent??'balanced'
      snapshot.value={subscription:result.subscription,members:[],shared:[]}
    }
  } else {
    const result=await call('/team')
    if (result) snapshot.value=result
  }
}
async function connector(id:string, action:'authorize'|'key'|'sync'|'disconnect') {
  connectionUrl.value=''
  const result=await call('/connectors/'+id+'/'+action,action==='key'?{key:providerKey.value}:{})
  if (!result) return
  if (action==='authorize') {
    const target=new URL(result.url)
    if (target.protocol==='https:'||target.protocol==='http:'&&['localhost','127.0.0.1'].includes(target.hostname)) connectionUrl.value=target.href
    return
  }
  if (action==='key') providerKey.value=''
  await refresh()
  status.value=action==='sync'?'已读取 '+result.rows.length+' 条':action==='disconnect'?'已解除连接':'已保存连接'
  if (action==='sync') output.value=JSON.stringify(result,null,2)
}
async function generate() {
  const result=await call('/models/generate',{id:crypto.randomUUID(),intent:intent.value,messages:[{role:'user',text:prompt.value}]})
  if (!result) return
  output.value=result.text
  await refresh()
  status.value='已生成 · '+result.model
}
function copyMcp() {
  try {link.value=go('/mcp').href;void navigator.clipboard?.writeText(link.value).catch(()=>{})}
  catch (error) {status.value=(error as Error).message}
}
</script>
<template>
  <section class="suite-services">
    <details class="suite-services__card">
      <summary>工作区服务设置</summary>
      <div class="sy-agent-actions">
        <SInput label="服务地址" v-model="endpoint" type="url" />
        <SInput label="工作区访问令牌" v-model="token" type="password" />
        <SButton size="sm" variant="secondary" :loading="busy" @click="refresh">读取工作区</SButton>
      </div>
    </details>
    <template v-if="mode==='connectors'">
      <section class="suite-services__card">
        <h2>数据连接</h2>
        <div v-for="entry in entries" :key="entry.id" class="suite-services__row">
          <div><strong>{{ entry.label }}</strong><small>{{ entry.type==='oauth'?'OAuth':'API Key' }} · {{ entry.connected?'已连接':entry.configured?'待授权':'待配置' }}</small></div>
          <div class="sy-agent-actions">
            <SButton v-if="entry.type==='oauth'" size="sm" variant="secondary" :disabled="!entry.configured||busy" @click="connector(entry.id,'authorize')">授权</SButton>
            <SButton v-if="entry.type==='key'" size="sm" variant="ghost" :disabled="!entry.configured" @click="selection=entry.id">选择</SButton>
            <SButton size="sm" variant="ghost" :disabled="!entry.connected||busy" @click="connector(entry.id,'sync')">同步</SButton>
            <SButton size="sm" variant="ghost" :disabled="!entry.connected||busy" @click="connector(entry.id,'disconnect')">解除</SButton>
          </div>
        </div>
        <a v-if="connectionUrl" :href="connectionUrl" target="_blank" rel="noopener noreferrer">前往授权页面</a>
        <div v-if="entries.some(entry=>entry.id===selection&&entry.configured)" class="sy-agent-actions">
          <SInput :label="selection+' API Key'" v-model="providerKey" type="password" />
          <SButton size="sm" variant="secondary" :disabled="!providerKey||busy" @click="connector(selection,'key')">连接</SButton>
        </div>
      </section>
    </template>
    <template v-else-if="mode==='mcp'">
      <section class="suite-services__card">
        <h2>工作区工具</h2>
        <div v-for="[tool,policy] in policies" :key="tool" class="suite-services__row"><span>{{ tool }}</span><strong>{{ policy }}</strong></div>
        <div class="sy-agent-actions"><SButton size="sm" variant="secondary" @click="copyMcp">取 MCP 地址</SButton>
          <SButton size="sm" variant="secondary" :loading="busy" @click="refresh">读取活动</SButton></div>
        <code v-if="link">{{ link }}</code>
      </section>
    </template>
    <template v-else-if="mode==='models'">
      <section class="suite-services__card">
        <h2>模型与工作区用量</h2>
        <div v-for="[plan,limit] in plans" :key="plan" class="suite-services__row"><strong>{{ plan }}</strong><span>{{ limit }} 单位</span></div>
        <p v-if="snapshot">当前账户 · {{ snapshot.subscription.plan }} · {{ snapshot.subscription.used??0 }} / {{ snapshot.subscription.limit??0 }}</p>
        <label v-if="models.length">模型线路 <select v-model="intent"><option v-for="model in models" :key="model.intent" :value="model.intent">{{ model.label }}</option></select></label>
        <STextArea label="请求内容" :rows="2" v-model="prompt" />
        <SButton size="sm" :loading="busy" :disabled="!models.length||!prompt.trim()" @click="generate">生成</SButton>
      </section>
      <section class="suite-services__card">
        <h2>版本记录</h2>
        <a v-for="release in releases" :key="release.version+release.platform" :href="release.url">{{ release.platform }} {{ release.version }} · {{ release.changes }}</a>
        <a href="https://gitlab.syntrofic.com/syntrofic/syntrofic-ui/-/blob/main/CHANGELOG.md">项目更新记录</a>
      </section>
    </template>
    <template v-else>
      <section class="suite-services__card">
        <h2>工作区成员</h2>
        <div v-for="member in snapshot?.members??[{subject:'林舟',role:'管理员'},{subject:'周禾',role:'支持'}]" :key="member.subject" class="suite-services__row"><strong>{{ member.subject }}</strong><span>{{ member.role }}</span></div>
      </section>
      <section class="suite-services__card">
        <h2>共享收件箱</h2>
        <p v-for="item in snapshot?.shared??[{id:'sample',title:'共享预览权限到期'}]" :key="item.id">{{ item.title }}</p>
      </section>
      <section class="suite-services__card">
        <h2>统一账单</h2>
        <p>{{ snapshot?.subscription.plan??'Team 示例' }} · {{ snapshot?.subscription.used??38 }} / {{ snapshot?.subscription.limit??2000 }} 单位</p>
      </section>
    </template>
    <pre v-if="output" class="suite-services__card">{{ output }}</pre>
    <p class="suite-services__status" role="status"><SMotionText :value="status" /></p>
  </section>
</template>
<style scoped>
.suite-services { display:grid;gap:9px }
.suite-services__card { display:grid;gap:8px;padding:12px 14px;background:#f2efe8;border-radius:15px;margin:0 }
.suite-services__card summary { cursor:pointer }
.suite-services__card[open] summary { margin-bottom:8px }
.suite-services__card h2,.suite-services__card p { margin:0 }
.suite-services__card a { width:max-content;max-width:100% }
.suite-services__row { display:flex;align-items:center;justify-content:space-between;gap:12px;padding:7px 9px;background:#fcfaf5;border-radius:10px }
.suite-services__row small { display:block;color:#505c55 }
.suite-services__status { min-height:1.45em;margin:0 }
pre { max-width:100%;overflow:auto;white-space:pre-wrap;overflow-wrap:anywhere }
</style>
