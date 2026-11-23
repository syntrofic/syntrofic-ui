<script setup lang="ts">
import { computed, ref } from 'nativescript-vue'
import type { NativeCollectionKey } from '../collection-state'
import SNativeButton from './SNativeButton.vue'
import SNativeInput from './SNativeInput.vue'
import SNativeLineChart from './SNativeLineChart.vue'
import SNativeMotionText from './SNativeMotionText.vue'
import SNativeNumberValue from './SNativeNumberValue.vue'
import SNativeProgressCircle from './SNativeProgressCircle.vue'
import SNativeSegment from './SNativeSegment.vue'
import SNativeSurface from './SNativeSurface.vue'
import SNativeText from './SNativeText.vue'

defineProps<{ kind: 'wallet' | 'fitness' }>()
const current = ref<NativeCollectionKey>('home')
const filter = ref<NativeCollectionKey>('all')
const wallet = [
  { id:'home', label:'组合' }, { id:'assets', label:'资产' }, { id:'history', label:'交易' }, { id:'transfer', label:'转账' },
]
const fitness = [
  { id:'home', label:'今日' }, { id:'plans', label:'训练计划' }, { id:'history', label:'训练记录' },
]
const assets = [
  { id:'a', label:'样本资产 A', value:624, quantity:4.8 },
  { id:'b', label:'样本资产 B', value:278, quantity:12 },
]
const trend = [560,635,610,710,802,902].map((value,index)=>({ label:'周' + (index + 1), values:{ portfolio:value } }))
const transactions = ref([{ id:1, title:'接收资产 A', direction:'in', amount:40 },{ id:2, title:'发出资产 B', direction:'out', amount:32 }])
const visible = computed(()=>transactions.value.filter(tx=>filter.value==='all' || tx.direction===filter.value))
const detail = ref('')
const direction = ref<NativeCollectionKey>('out')
const amount = ref('')
const account = ref('')
const result = ref('')
function transfer() {
  const number = Number(amount.value)
  if (!account.value.trim() || !Number.isFinite(number) || number <= 0) { result.value='请填写模拟账户与有效金额'; return }
  transactions.value = [{ id: transactions.value.length+1, title:account.value.trim(), direction:String(direction.value), amount:number }, ...transactions.value]
  amount.value = ''
  current.value = 'history'
  result.value = '模拟交易已记录'
}
const plans = [
  { id:'run', name:'耐力练习', sets:4 }, { id:'strength', name:'力量练习', sets:6 }, { id:'mobility', name:'拉伸练习', sets:3 },
]
const training = ref<typeof plans[number]>()
const sets = ref(0)
const sessions = ref<{ id:number; title:string; sets:number }[]>([])
function start(plan: typeof plans[number]) { training.value=plan; sets.value=0; current.value='workout' }
function finish() {
 if (!training.value || !sets.value) return
 sessions.value = [{ id:sessions.value.length+1,title:training.value.name,sets:sets.value },...sessions.value]
 result.value = '今日训练完成'
 training.value=undefined
 current.value='history'
}
</script>

<template>
  <StackLayout>
    <SNativeSegment v-model="current" :items="kind === 'wallet' ? wallet : fitness" :label="kind === 'wallet' ? '资产分区' : '训练分区'" />
    <template v-if="kind === 'wallet'">
      <SNativeSurface v-if="current === 'home'" tone="sage" :padding="11" marginTop="8">
        <SNativeText text="模拟组合金额" size="caption" tone="muted" />
        <SNativeNumberValue :value="902" prefix="¥" :size="23" label="模拟组合金额" />
        <SNativeLineChart label="组合变化" :data="trend" :series="[{key:'portfolio',label:'组合'}]" :height="160" dataLabel="查看明细" />
      </SNativeSurface>
      <StackLayout v-else-if="current === 'assets'" marginTop="8">
        <SNativeButton v-for="asset in assets" :key="asset.id" :label="asset.label" size="sm" variant="secondary" marginBottom="5"
          @tap="detail = asset.label + ' · ' + asset.quantity + ' 份 · ¥' + asset.value" />
        <SNativeMotionText v-if="detail" :value="detail" announce />
      </StackLayout>
      <StackLayout v-else-if="current === 'history'" marginTop="8">
        <SNativeSegment v-model="filter" :items="[{id:'all',label:'全部'},{id:'in',label:'接收'},{id:'out',label:'发出'}]" label="交易筛选" />
        <SNativeText v-for="tx in visible" :key="tx.id" :text="tx.title + ' · ' + (tx.direction === 'in' ? '+' : '−') + tx.amount" marginTop="6" />
      </StackLayout>
      <StackLayout v-else marginTop="8">
        <SNativeSegment v-model="direction" :items="[{id:'out',label:'发出'},{id:'in',label:'接收'}]" label="交易方向" />
        <SNativeInput v-model="account" label="模拟账户" marginTop="6" />
        <SNativeInput v-model="amount" label="模拟金额" marginTop="6" />
        <SNativeButton label="记录模拟交易" size="sm" marginTop="6" @tap="transfer" />
      </StackLayout>
    </template>
    <template v-else>
      <SNativeSurface v-if="current === 'home'" tone="sage" :padding="11" marginTop="8">
        <GridLayout columns="*,*,*">
          <SNativeProgressCircle :value="72" label="活动" size="md" />
          <SNativeProgressCircle col="1" :value="54" label="训练" size="md" tone="success" />
          <SNativeProgressCircle col="2" :value="sessions.length ? 100 : 43" label="今日目标" size="md" tone="warning" />
        </GridLayout>
      </SNativeSurface>
      <StackLayout v-else-if="current === 'plans'" marginTop="8">
        <SNativeButton v-for="plan in plans" :key="plan.id" :label="plan.name + ' · ' + plan.sets + ' 组'" size="sm" variant="secondary"
          marginBottom="5" @tap="start(plan)" />
      </StackLayout>
      <SNativeSurface v-else-if="current === 'workout' && training" tone="blue" :padding="12" marginTop="8">
        <StackLayout>
          <SNativeText :text="training.name" heading />
          <SNativeMotionText :value="sets + ' / ' + training.sets + ' 组'" announce />
          <GridLayout columns="*,*" marginTop="6">
            <SNativeButton label="记录一组" size="sm" variant="secondary" :disabled="sets >= training.sets" @tap="sets++" marginRight="3" />
            <SNativeButton col="1" label="结束训练" size="sm" :disabled="sets === 0" @tap="finish" marginLeft="3" />
          </GridLayout>
        </StackLayout>
      </SNativeSurface>
      <StackLayout v-else marginTop="8">
        <SNativeText v-if="!sessions.length" text="暂无训练记录" tone="muted" />
        <SNativeText v-for="session in sessions" :key="session.id" :text="session.title + ' · ' + session.sets + ' 组'" marginBottom="5" />
      </StackLayout>
    </template>
    <SNativeMotionText v-if="result" :value="result" announce marginTop="5" />
  </StackLayout>
</template>
