import { serviceUrl } from './connectors.mjs'

export function createModelGateway(settings, { http=fetch }={}) {
  const routes=new Map(Object.entries(settings??{}).map(([intent,model])=>[intent,{...model,endpoint:serviceUrl(model.endpoint)}]))
  function models() { return [...routes].map(([intent,model])=>({intent,label:model.label??model.id})) }
  async function generate(intent, messages, signal) {
    const route=routes.get(intent)
    if (!route) throw new Error('Model route is not configured')
    if (!Array.isArray(messages) || messages.length<1 || messages.length>24 || !messages.every(item=>
      ['user','assistant'].includes(item?.role) && typeof item.text==='string' && item.text.length>0&&item.text.length<=8000)) {
      throw new Error('Invalid model input')
    }
    const response=await http(route.endpoint,{method:'POST',redirect:'error',signal:AbortSignal.any([signal,AbortSignal.timeout(30000)]),
      headers:{'Content-Type':'application/json',Accept:'application/json',...(route.token&&{Authorization:'Bearer '+route.token})},
      body:JSON.stringify({model:route.id,messages:messages.map(message=>({role:message.role,text:message.text}))})})
    if (!response.ok) throw new Error('Model request failed')
    const result=await response.json()
    if (typeof result.text!=='string'||result.text.length>60000) throw new Error('Model returned an invalid response')
    return {model:route.label??route.id,text:result.text}
  }
  return {models,generate}
}
