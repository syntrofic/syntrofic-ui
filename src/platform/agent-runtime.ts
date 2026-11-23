import { parseAgentDocument, type AgentDocument } from '../agent-ui/schema'

export interface KnowledgeSource { id: string; label: string; text: string; origin?: string; status: 'ready' | 'error' }
export interface KnowledgeMatch { source: KnowledgeSource; excerpt: string; score: number }
export interface AgentAttachment { name: string; content: string; mediaType?: string }
export interface HostedAgent { id: string; name: string; model: string; prompt: string }
export interface HostedMessage { id: string; role: 'user'|'assistant'; text: string; attachments?: readonly AgentAttachment[]; document?: AgentDocument }
export interface AgentConversation { id: string; agent: string; title: string; messages: HostedMessage[] }
export interface AgentRuntimeEvent { id: string; run: string; agent: string; conversation: string; state: 'started'|'completed'|'failed'|'cancelled'; time: number; error?: string }
export interface AgentState {
  agents: HostedAgent[]
  conversations: AgentConversation[]
  sources: KnowledgeSource[]
  events: AgentRuntimeEvent[]
}
export type AgentChunk = { text?: string; document?: unknown }
export type AgentAdapter = (request: {
  agent: HostedAgent; conversation: AgentConversation; matches: readonly KnowledgeMatch[]; signal: AbortSignal
}) => AsyncIterable<AgentChunk>

const uuid = () => globalThis.crypto.randomUUID()
const bounded = (value: string, max: number) => value.trim().slice(0,max)
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T

export function knowledgeMatches(sources: readonly KnowledgeSource[], input: string, limit = 6) {
  const terms = [...new Set(input.toLowerCase().trim().split(/[\s,，。！？；:：]+/).filter(Boolean))].slice(0,20)
  if (!terms.length) return []
  return sources.flatMap(source => {
    if (source.status!=='ready') return []
    const haystack=source.text.toLowerCase()
    const positions=terms.map(term=>haystack.indexOf(term)).filter(index=>index>=0)
    if (!positions.length) return []
    const at=Math.max(0,Math.min(...positions)-70)
    return [{source,excerpt:source.text.slice(at,at+240),score:positions.length}]
  }).sort((a,b)=>b.score-a.score).slice(0,limit)
}

export function createAgentRuntime(initial?: AgentState, change?: (state: AgentState) => void) {
  const state: AgentState=initial?clone(initial):{agents:[],conversations:[],sources:[],events:[]}
  const active=new Map<string,AbortController>()
  function publish() { change?.(clone(state)) }
  function upsert(agent: HostedAgent) {
    const id=bounded(agent.id,100)
    if (!id || !agent.name.trim() || !agent.model.trim()) throw new Error('Agent identifier, name and model are required')
    const item={id,name:bounded(agent.name,100),model:bounded(agent.model,100),prompt:bounded(agent.prompt,12000)}
    state.agents=[item,...state.agents.filter(value=>value.id!==id)]
    publish()
    return item
  }
  function addSource(source: Omit<KnowledgeSource,'status'>) {
    const item: KnowledgeSource={id:bounded(source.id,100)||uuid(),label:bounded(source.label,120),
      text:bounded(source.text,120000),origin:source.origin?bounded(source.origin,1000):undefined,status:'ready'}
    if (!item.text) item.status='error'
    state.sources=[item,...state.sources.filter(value=>value.id!==item.id)].slice(0,100)
    publish()
    return item
  }
  function removeSource(id: string) { state.sources=state.sources.filter(item=>item.id!==id); publish() }
  function conversation(agent: string,title: string) {
    if (!state.agents.some(item=>item.id===agent)) throw new Error('Unknown agent')
    const item: AgentConversation={id:uuid(),agent,title:bounded(title,120)||'New conversation',messages:[]}
    state.conversations=[item,...state.conversations]
    publish()
    return clone(item)
  }
  async function run(id: string, text: string, adapter: AgentAdapter, attachments: readonly AgentAttachment[] = []) {
    const thread=state.conversations.find(item=>item.id===id)
    const agent=thread && state.agents.find(item=>item.id===thread.agent)
    if (!thread || !agent || active.has(id) || !text.trim() && !attachments.length) throw new Error('Cannot start this run')
    const request=uuid()
    const controller=new AbortController()
    const result: HostedMessage={id:uuid(),role:'assistant',text:''}
    const message: HostedMessage={id:uuid(),role:'user',text:bounded(text,10000),attachments:attachments.slice(0,8).map(item=>({
      name:bounded(item.name,180),content:bounded(item.content,80000),mediaType:item.mediaType,
    }))}
    function event(stateName: AgentRuntimeEvent['state'], error?: string) {
      state.events=[...state.events.slice(-999),{id:uuid(),run:request,agent:agent!.id,conversation:id,state:stateName,time:Date.now(),error}]
      publish()
    }
    active.set(id,controller)
    thread.messages.push(message,result)
    event('started')
    try {
      const matches=knowledgeMatches(state.sources,message.text)
      const input={agent:clone(agent),conversation:clone({...thread,messages:thread.messages.slice(0,-1)}),matches:clone(matches),signal:controller.signal}
      for await (const chunk of adapter(input)) {
        controller.signal.throwIfAborted()
        if (typeof chunk.text==='string') result.text=(result.text+chunk.text).slice(0,50000)
        if (chunk.document!==undefined) result.document=parseAgentDocument(chunk.document)
        publish()
      }
      controller.signal.throwIfAborted()
      event('completed')
    } catch (error) {
      event(controller.signal.aborted?'cancelled':'failed',controller.signal.aborted?undefined:error instanceof Error?error.message.slice(0,200):'Run failed')
    } finally { active.delete(id) }
    return clone(result)
  }
  return { snapshot:()=>clone(state),upsert,addSource,removeSource,conversation,run,stop:(id:string)=>active.get(id)?.abort(),
    search:(query:string)=>clone(knowledgeMatches(state.sources,query)) }
}
