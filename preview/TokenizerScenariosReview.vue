<script setup lang="ts">
import { computed, ref } from 'vue'
import { SButton, SForm, SMotionText, STokenizer, type SelectOption } from '../src'

const people: SelectOption[] = [
  { value: 'lin', label: '林舟 · 品牌设计', icon: 'users' },
  { value: 'chen', label: '陈禾 · 交付管理', icon: 'users' },
  { value: 'jiang', label: '江时 · 产品设计', icon: 'users' },
  { value: 'lu', label: '陆珊 · 品牌策略', icon: 'users' },
  { value: 'zhou', label: '周昱 · 设计系统', icon: 'users' },
  { value: 'xu', label: '许然 · 发布审核', icon: 'users' },
]
const tags = ref<string[]>([])
const helpers = ref<string[]>(['lin'])
const reviewers = ref<string[]>([])
const limited = ref<string[]>(['lin', 'chen'])
const inline = ref(people.map(person => person.value))
const floating = ref(people.map(person => person.value))
const verification = computed(() => reviewers.value.length
  ? { type: 'success' as const, message: '已满足评审要求。' }
  : { type: 'error' as const, message: '至少添加一名评审人。' })
const applied = ref('')
const saved = ref('')
const removeLabel = (label: string) => '移除' + label
const createLabel = (label: string) => '新建「' + label + '」'
const moreLabel = (count: number) => '另有 ' + count + ' 项'
</script>

<template>
  <section class="tokenizer-scenarios" aria-label="标签输入场景">
    <div class="review__columns">
      <STokenizer v-model="tags" :options="[]" label="发布标签" placeholder="输入标签后按回车" creatable clearable
        :create-label="createLabel" :remove-label="removeLabel" clear-label="清空发布标签" dismiss-label="取消清空" />
      <STokenizer v-model="helpers" :options="people" label="发布协作者" placeholder="查找目录或输入姓名" open-on-focus
        creatable start-icon="search" :create-label="createLabel" :remove-label="removeLabel">
        <template #end="{ values }">
          <SButton size="sm" variant="secondary" @click="applied = '已应用 ' + values.length + ' 位发布协作者'">确认协作者</SButton>
        </template>
      </STokenizer>
    </div>
    <p role="status" aria-label="协作者应用结果"><SMotionText :value="applied" /></p>
    <STokenizer v-model="limited" :options="people" label="发布审批人" placeholder="搜索审批人" open-on-focus
      :max-entries="3" description="最多选择三位审批人。" limit-text="已选满三位审批人。移除后可以继续添加。" :remove-label="removeLabel" />
    <div class="review__columns">
      <STokenizer v-model="inline" :options="people" label="内联展开协作者" placeholder="搜索协作者" token-overflow-behavior="unfocusedInline"
        :more-label="moreLabel" :remove-label="removeLabel" />
      <STokenizer v-model="floating" :options="people" label="浮层展开协作者" placeholder="搜索协作者" token-overflow-behavior="unfocusedLayer"
        :more-label="moreLabel" :remove-label="removeLabel" />
    </div>
    <div class="review__columns">
      <STokenizer :model-value="['lin', 'jiang']" :options="people" label="继承的发布成员" disabled />
      <STokenizer :model-value="['xu']" :options="people" label="复核人员" :status="{ type: 'warning', message: '建议再添加一名复核人员。' }" />
    </div>
    <SForm class="tokenizer-scenarios" name="delivery-review" @submit="(_, data) => saved = data.getAll('reviewer').join('、')" @reset="saved = ''">
      <STokenizer v-model="reviewers" :options="people" label="交付评审人" name="reviewer" required :status="verification"
        placeholder="查找评审人" :remove-label="removeLabel" />
      <div class="review__row">
        <SButton type="submit" size="sm">保存评审人</SButton>
        <SButton type="reset" size="sm" variant="secondary">重置评审人</SButton>
        <output aria-label="已保存评审人"><SMotionText :value="saved" /></output>
      </div>
    </SForm>
  </section>
</template>

<style scoped>
.tokenizer-scenarios { min-inline-size: 0; display: grid; gap: var(--sy-space-4); }
.tokenizer-scenarios p { margin: 0; }
</style>
