<script setup lang="ts">
import { ApplicationSettings } from '@nativescript/core'
import { onUnmounted,ref } from 'nativescript-vue'
import { SNativeButton, SNativeMotionText, SNativeProvider, SNativeSurface, SNativeText } from '@syntrofic/ui-native'

type Message = { id:string;title:string;group:string }
type Support = { id:string;title:string;owner:string }
type Team = { members:{subject:string;role:string}[];subscription:{plan?:string;used?:number;limit?:number};shared:{id:string;title:string}[] }
const key='syntrofic-mobile-support-v1'
const messages=ref<Message[]>([
  {id:'m1',title:'二轮校对材料已送达',group:'待分类'},
  {id:'m2',title:'本次登录验证码',group:'待分类'},
])
const sample:Support[]=[{id:'248',title:'共享预览权限到期',owner:'待指派'}]
function savedSupport():Support[] {
  try { return JSON.parse(ApplicationSettings.getString(key,JSON.stringify(sample))) } catch { return sample }
}
const tickets=ref(savedSupport())
const team=ref<Team>({members:[{subject:'林舟',role:'管理员'},{subject:'周禾',role:'支持'}],
  subscription:{plan:'Team 示例',used:38,limit:2000},shared:[]})
const status=ref('')
const panel=ref<'inbox'|'team'>('inbox')
const timer=setTimeout(()=>{
  messages.value=messages.value.map(item=>({...item,group:/验证码|verification/i.test(item.title)?'验证邮件':'项目更新'}))
  status.value='示例邮件分类完成'
},1800)
onUnmounted(()=>clearTimeout(timer))
function assign(id:string) {
  tickets.value=tickets.value.map(item=>item.id===id?{...item,owner:'周禾'}:item)
  ApplicationSettings.setString(key,JSON.stringify(tickets.value))
  status.value='已指派给周禾'
}
</script>

<template>
  <Page>
    <ActionBar title="386 移动工作台" />
    <SNativeProvider>
      <ScrollView>
        <StackLayout padding="12">
          <GridLayout columns="*,*" marginBottom="8">
            <SNativeButton label="共享收件箱" size="sm" :pressed="panel==='inbox'" variant="secondary" marginRight="3" @tap="panel='inbox'" />
            <SNativeButton col="1" label="团队与用量" size="sm" :pressed="panel==='team'" variant="secondary" marginLeft="3" @tap="panel='team'" />
          </GridLayout>
          <template v-if="panel==='inbox'">
            <SNativeSurface :padding="10" marginBottom="8">
              <SNativeText text="邮件分类" heading size="title" marginBottom="5" />
              <GridLayout v-for="item in messages" :key="item.id" columns="*,auto" marginBottom="4">
                <SNativeText :text="item.title" />
                <SNativeMotionText col="1" :value="item.group" announce marginLeft="5" />
              </GridLayout>
            </SNativeSurface>
            <SNativeSurface :padding="10">
              <SNativeText text="客服收件箱" heading size="title" marginBottom="5" />
              <GridLayout v-for="ticket in tickets" :key="ticket.id" columns="*,auto" rows="auto,auto" marginBottom="5">
                <SNativeText :text="ticket.title" />
                <SNativeMotionText row="1" :value="ticket.owner" announce />
                <SNativeButton col="1" rowSpan="2" label="指派周禾" size="sm" variant="secondary" :disabled="ticket.owner==='周禾'" @tap="assign(ticket.id)" />
              </GridLayout>
            </SNativeSurface>
          </template>
          <template v-else>
            <SNativeSurface :padding="10" marginBottom="8">
              <SNativeText text="团队成员" heading size="title" marginBottom="5" />
              <SNativeText v-for="member in team.members" :key="member.subject" :text="member.subject+' · '+member.role" marginBottom="4" />
            </SNativeSurface>
            <SNativeSurface :padding="10">
              <SNativeText text="统一账单与用量" heading size="title" marginBottom="5" />
              <SNativeText :text="team.subscription.plan??'待配置'" />
              <SNativeMotionText :value="`${team.subscription.used??0} / ${team.subscription.limit??0} 单位`" />
            </SNativeSurface>
          </template>
          <SNativeMotionText :value="status" announce marginTop="7" />
        </StackLayout>
      </ScrollView>
    </SNativeProvider>
  </Page>
</template>
