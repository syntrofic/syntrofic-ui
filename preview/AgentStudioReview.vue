<script setup lang="ts">
import { computed, onBeforeUnmount, ref, shallowRef } from 'vue'
import { SAgentUI, SButton, SInput, SSelect, STextArea, createAgentRuntime, type AgentState } from '../src'
import { reviewAgentNode } from './agent-review'
const props = defineProps<{ panel:'agents'|'knowledge'|'events' }>()
const key='syntrofic-agent-studio-v1'
function load(): AgentState|undefined {
  try { return JSON.parse(localStorage.getItem(key)??'null')??undefined } catch { return undefined }
}
const state=shallowRef<AgentState>(load()??{agents:[],conversations:[],sources:[],events:[]})
const runtime=createAgentRuntime(state.value,next=>{state.value=next;try{localStorage.setItem(key,JSON.stringify(next))}catch{}})
if (!state.value.agents.length) runtime.upsert({ id:'review',name:'交付助手',model:'local-demo',prompt:'从提供的资料整理交付项目。' })
if (!state.value.sources.length) runtime.addSource({ id:'note-01',label:'品牌复核记录',text:'品牌规范已完成复核。版式样张等待校对，使用授权待补。',origin:'示例资料' })
const agent=ref(state.value.agents[0].id)
const thread=ref('')
const name=ref(state.value.agents[0].name)
const model=ref(state.value.agents[0].model)
const prompt=ref(state.value.agents[0].prompt)
const message=ref('')
const title=ref('')
const sourceText=ref('')
const url=ref('')
const filter=ref('')
const output=ref('')
const busy=ref(false)
const activeThread=ref('')
const attachments=ref<{name:string;content:string;mediaType:string}[]>([])
const assistant = computed(()=>state.value.agents.find(value=>value.id===agent.value))
const conversation = computed(()=>state.value.conversations.find(value=>value.id===thread.value))
const matches = computed(()=> { void state.value.sources;return runtime.search(filter.value) })
const events = computed(()=>state.value.events.slice(-12).reverse())
const count = computed(()=>({ok:state.value.events.filter(item=>item.state==='completed').length, failed:state.value.events.filter(item=>item.state==='failed').length}))
function select(id:string) {
  const value=state.value.agents.find(item=>item.id===id)
  if (!value) return
  agent.value=id
  thread.value=''
  name.value=value.name
  model.value=value.model
  prompt.value=value.prompt
}
function save() { runtime.upsert({id:agent.value,name:name.value,model:model.value,prompt:prompt.value});output.value='已保存 Agent' }
function create() {
  const newAgent=runtime.upsert({id:crypto.randomUUID(),name:'新助手',model:'local-demo',prompt:''})
  select(newAgent.id)
}
function add() {
  if (!title.value.trim()||!sourceText.value.trim()) return
  runtime.addSource({id:crypto.randomUUID(),label:title.value,text:sourceText.value})
  title.value=''
  sourceText.value=''
}
async function file(event: Event, attach=false) {
  const selected=(event.target as HTMLInputElement).files?.[0]
  if (!selected || selected.size>120000) { output.value='请选择 120 KB 以内的文本文件'; return }
  const content=await selected.text()
  if (attach) attachments.value=[...attachments.value,{name:selected.name,content,mediaType:selected.type}].slice(-8)
  else runtime.addSource({id:crypto.randomUUID(),label:selected.name,text:content,origin:'上传文本'})
}
async function indexSite() {
  try {
    const address=new URL(url.value)
    if (address.protocol!=='https:'||address.username||address.password) throw new Error('网站地址须使用 HTTPS')
    const r=await fetch(address,{credentials:'omit',redirect:'error',signal:AbortSignal.timeout(5000)})
    if (!r.ok) throw new Error('来源无法读取')
    const markup=(await r.text()).slice(0,160000)
    const page=new DOMParser().parseFromString(markup,'text/html')
    page.querySelectorAll('script,style').forEach(node=>node.remove())
    runtime.addSource({id:crypto.randomUUID(),label:page.title||address.hostname,text:page.body.textContent??'',origin:address.href})
    output.value='已索引网页'
  } catch (error) { output.value=error instanceof Error?error.message:'索引失败' }
}
function findSpeech() {
  type Speech = { lang:string; start:()=>void; onresult:(event:{results:ArrayLike<ArrayLike<{transcript:string}>>})=>void }
  const supported=window as typeof window & {SpeechRecognition?:new()=>Speech; webkitSpeechRecognition?:new()=>Speech}
  const Recognition=supported.SpeechRecognition??supported.webkitSpeechRecognition
  if (!Recognition) { output.value='当前浏览器无法启动语音输入';return }
  const recognition=new Recognition()
  recognition.lang='zh-CN'
  recognition.onresult=event=>{message.value=event.results[0][0].transcript}
  recognition.start()
}
async function send() {
  if (busy.value || !assistant.value || !message.value.trim()&&!attachments.value.length) return
  if (!thread.value) thread.value=runtime.conversation(agent.value,message.value.slice(0,21)).id
  const input=message.value
  message.value=''
  activeThread.value=thread.value
  busy.value=true
  try {
    await runtime.run(activeThread.value,input,async function* ({ matches, signal }) {
      const value=matches[0]?.excerpt??'当前资料库中没有精确匹配，以下为示例复核资料。'
      for (const character of value) {
        signal.throwIfAborted()
        await new Promise(resolve=>setTimeout(resolve,20))
        yield {text:character}
      }
      yield {document:{version:1,nodes:[reviewAgentNode('data-table')]}}
    },attachments.value)
    attachments.value=[]
  } finally { busy.value=false;activeThread.value='' }
}
onBeforeUnmount(()=>runtime.stop(activeThread.value))
</script>
<template>
  <div class="sy-agent-section">
    <template v-if="props.panel==='agents'">
      <div class="sy-agent-actions">
        <SSelect label="Agent" :model-value="agent" :options="state.agents.map(value=>({label:value.name,value:value.id}))" @update:model-value="select(String($event))" />
        <SButton size="sm" variant="secondary" @click="create">新增 Agent</SButton>
      </div>
      <div class="sy-agent-fields">
        <SInput label="名称" v-model="name" /><SInput label="模型 ID" v-model="model" />
        <STextArea label="系统指令" v-model="prompt" :rows="2" />
        <SButton size="sm" variant="secondary" @click="save">保存设置</SButton>
      </div>
      <div class="sy-agent-actions">
        <SSelect label="历史会话" v-model="thread" :options="state.conversations.filter(value=>value.agent===agent).map(value=>({label:value.title,value:value.id}))" />
        <SButton size="sm" variant="ghost" :disabled="busy" @click="thread=''">新会话</SButton>
      </div>
      <section v-for="entry in conversation?.messages" :key="entry.id" class="sy-agent-card">
        <strong>{{ entry.role==='user'?'你':'助手' }}</strong><p>{{ entry.text }}</p>
        <SAgentUI v-if="entry.document" :document="entry.document" />
      </section>
      <div class="sy-agent-fields">
        <SInput label="发送消息" v-model="message" />
        <label>附加文本文件 <input type="file" accept=".txt,.md,.csv,.json" @change="file($event,true)"></label>
        <p v-if="attachments.length">{{ attachments.map(item=>item.name).join('、') }}</p>
        <div class="sy-agent-actions"><SButton size="sm" :loading="busy" @click="send">发送</SButton>
          <SButton size="sm" variant="ghost" :disabled="!busy" @click="runtime.stop(activeThread)">停止</SButton>
          <SButton size="sm" variant="ghost" @click="findSpeech">语音输入</SButton></div>
      </div>
    </template>
    <template v-else-if="props.panel==='knowledge'">
      <div class="sy-agent-fields">
        <SInput label="来源标题" v-model="title" />
        <STextArea label="来源文本" v-model="sourceText" :rows="3" />
        <SButton size="sm" variant="secondary" @click="add">添加资料</SButton>
        <label>导入文本 <input type="file" accept=".txt,.md,.csv,.json" @change="file($event)"></label>
        <div class="sy-agent-actions"><SInput label="网页 URL" v-model="url" type="url" />
          <SButton size="sm" variant="secondary" @click="indexSite">索引网页</SButton></div>
      </div>
      <SInput label="搜索资料" v-model="filter" />
      <p v-for="item in matches" :key="item.source.id">{{ item.source.label }} · {{ item.excerpt }}</p>
      <div v-for="item in state.sources" :key="item.id" class="sy-agent-actions">
        <strong>{{ item.label }}</strong><span>{{ item.status==='ready'?'已索引':'需要补充内容' }}</span>
        <SButton size="sm" variant="ghost" @click="runtime.removeSource(item.id)">移除</SButton>
      </div>
    </template>
    <template v-else>
      <div class="sy-agent-actions"><span>完成 {{ count.ok }}</span><span>失败 {{ count.failed }}</span><span>会话 {{ state.conversations.length }}</span></div>
      <p v-if="!events.length">暂无运行记录</p>
      <p v-for="item in events" :key="item.id">{{ new Date(item.time).toLocaleTimeString() }} · {{ item.agent }} · {{ item.state }}</p>
      <pre>GET /agents · GET /usage · GET /audit</pre>
    </template>
    <p v-if="output" role="status">{{ output }}</p>
  </div>
</template>
