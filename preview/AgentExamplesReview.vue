<script setup lang="ts">
import { computed, ref } from 'vue'
import { SAgentUI, SButton, SInput, SSelect, SWorkspaceTemplate, type AgentDocument, type AgentNode, type AgentNodeKind } from '../src'
import { reviewAgentNode } from './agent-review'
const examples = [
  { id:'map', label:'地图旅行', kind:'map', title:'车站与集合点' },
  { id:'bank', label:'商业银行', kind:'metric-grid', title:'模拟账户余额' },
  { id:'doc', label:'协作文档', kind:'record-card', title:'版本合并记录' },
  { id:'board', label:'白板', kind:'grid', title:'原型评审白板' },
  { id:'sheet', label:'可编辑表格', kind:'data-table', title:'交付材料清单' },
  { id:'crypto', label:'加密资产与外汇', kind:'line-chart', title:'模拟行情变化' },
  { id:'plan', label:'行程规划', kind:'steps', title:'从工作室到会场' },
  { id:'store', label:'店铺运营', kind:'kpi-grid', title:'上架与售出' },
  { id:'shop', label:'购物', kind:'product-card', title:'工作记录本' },
  { id:'mail', label:'邮件', kind:'record-card', title:'等待回复' },
  { id:'food', label:'美食探索', kind:'list', title:'午餐选项' },
  { id:'health', label:'健康', kind:'meter-list', title:'今日活动' },
  { id:'support', label:'客服', kind:'callout', title:'售后待处理' },
] as const
const selected = ref<string>('travel')
const message = ref('')
const pending = ref(false)
const cell = ref('品牌规范')
const current = computed(() => examples.find(entry=>entry.id===selected.value)??examples[0])
const document = computed<AgentDocument>(() => {
  const entry = current.value
  const node: AgentNode = { ...reviewAgentNode(entry.kind as AgentNodeKind), id:'example', title:entry.title }
  if (entry.id==='sheet') node.values = [{id:'edited',label:cell.value,values:{版本:3,状态:'已复核'}},{id:'next',label:'授权文件',values:{版本:1,状态:'待复核'}}]
  if (entry.id==='food') node.values = [{id:'rice',label:'香菇饭',detail:'距离 350 米'},{id:'noodles',label:'清汤面',detail:'距离 580 米'}]
  if (entry.id==='plan') node.values = [{id:'start',label:'10:00 集合',detail:'工作室入口'},{id:'transfer',label:'10:16 换乘',detail:'中心站'},{id:'end',label:'10:40 到场',detail:'一号展厅'}]
  if (entry.id==='health') node.values = [{id:'move',label:'活动目标',value:68},{id:'train',label:'训练计划',value:53}]
  if (entry.id==='support') { node.text='工单等待补充订单编号。'; node.actions=[] }
  if (entry.id==='board') node.children=[{id:'plan',kind:'card',title:'修改标题',text:'统一字体和字号。'},{id:'draft',kind:'card',title:'已核对',text:'封面及授权信息。'}]
  return { version:1, nodes:[node] }
})
</script>
<template>
  <div class="sy-agent-section">
    <SSelect label="产品示例" v-model="selected" :options="examples.map(item=>({label:item.label,value:item.id}))" />
    <SInput v-if="current.id==='sheet'" label="第一行材料名" v-model="cell" />
    <SWorkspaceTemplate v-if="current.id==='mail'" kind="mail" />
    <SAgentUI v-else :key="current.id" :document="document" @action="message = $event.action" />
    <div class="sy-agent-actions">
      <SButton variant="secondary" size="sm" @click="message='已读取示例数据'">读取资料</SButton>
      <SButton size="sm" variant="ghost" @click="pending=true; message='等待批准'">提交模拟操作</SButton>
      <SButton v-if="pending" size="sm" @click="pending=false; message='已批准并完成'">批准</SButton>
    </div>
    <p v-if="message" role="status">{{ message }}</p>
  </div>
</template>
