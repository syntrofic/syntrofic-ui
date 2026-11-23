<script setup lang="ts">
import { computed, ref } from 'vue'
import { SButton, SForm, SInput, SMotionText, SNumberField, SSelect, STextArea, type FieldStatus, type FieldStatusVariant, type NumberEntryError } from '../src'
import I18nProvider from '../src/rac/I18nProvider.vue'

defineProps<{ kind: 'text' | 'textarea' | 'number' }>()

const query = ref('')
const name = ref('品牌资源库')
const email = ref('')
const description = ref('')
const variant = ref<FieldStatusVariant>('attached')
const result = ref('')
const percent = ref<number | undefined>(75)
const guests = ref<number | undefined>(12)
const speed = ref<number | undefined>(1.25)
const numberError = ref<NumberEntryError | null>(null)
const warning: FieldStatus = { type: 'warning', message: '此内容会随资料一同交付。', live: 'off' }
const success: FieldStatus = { type: 'success', message: '已核对，可使用此值。', live: 'off' }
const emailStatus = computed<FieldStatus>(() => email.value.includes('@')
  ? { type: 'success', message: '邮箱格式已确认。', live: 'off' }
  : { type: 'error', message: '请输入可接收交付通知的邮箱。', label: '邮箱校验提示', live: 'off' })
const descriptionStatus = computed<FieldStatus>(() => description.value.trim().length
  ? { type: 'success', message: '已填写交付说明。', live: 'off' }
  : { type: 'error', message: '请补充交付说明。', live: 'off' })
const presentations = [{ value: 'attached', label: '贴合输入框' }, { value: 'detached', label: '独立消息' }, { value: 'tooltip', label: '工具提示' }]
const sizes = [{ value: 'sm', label: '小号输入' }, { value: 'md', label: '中号输入' }, { value: 'lg', label: '大号输入' }] as const
const fieldMessages = {
  'field.optional': '选填',
  'field.countRemaining': '还可输入 {count} 个字符',
  'field.countExceeded': '已超出 {count} 个字符',
}
const formatSpeed = (number: number) => `${number.toFixed(2)} 倍速`

function find() { result.value = query.value.trim() ? '搜索了 ' + query.value.trim() : '请输入搜索词' }
async function syncName(value: string, _event: Event, signal: AbortSignal) {
  await new Promise<void>(resolve => {
    const timer = setTimeout(resolve, 650)
    signal.addEventListener('abort', () => { clearTimeout(timer); resolve() }, { once: true })
  })
  if (!signal.aborted) result.value = '已同步名称 ' + value
}
function submitGuests(_event: SubmitEvent, data: FormData) { result.value = '已保存人数 ' + data.get('guests') }
</script>

<template>
  <I18nProvider :as="false" locale="zh-CN" :messages="fieldMessages">
    <section v-if="kind === 'text'" class="review__editable" aria-label="文本输入示例">
      <div class="review__editable-actions">
        <SInput v-model="query" type="search" size="sm" label="搜索发布记录" hide-label start-icon="search" clearable clear-label="清除搜索"
          placeholder="搜索发布记录" enterkeyhint="search" @enter="find" />
        <SButton size="sm" @click="find">搜索</SButton>
      </div>
      <div class="review__editable-columns">
        <SInput v-for="item in sizes" :key="item.value" :size="item.value" :label="item.label" placeholder="项目代号" />
      </div>
      <SInput v-model="name" label="项目名称" autocomplete="organization" :change-action="syncName" required
        description="修改名称后会同步到工作区。" label-tooltip="已归档的旧记录保留原有名称。" label-tooltip-label="名称使用说明" />
      <div class="review__editable-columns">
        <SInput label="访问口令" type="password" start-icon="link" optional autocomplete="new-password" />
        <SInput label="工作区编号" model-value="DESIGN-204" readonly />
      </div>
      <SInput label="发布负责人" model-value="由管理员分配" disabled disabled-message="只有工作区管理员可以分配负责人。" />
      <SSelect v-model="variant" label="验证反馈方式" :options="presentations" />
      <SInput v-model="email" type="email" autocomplete="email" label="联系邮箱" start-icon="info" :status="emailStatus" :status-variant="variant" />
      <div class="review__editable-columns">
        <SInput label="外部链接" type="url" :status="warning" />
        <SInput label="联系电话" type="tel" model-value="021 5555 8800" :status="success" />
      </div>
      <SMotionText :value="result" announce />
    </section>

    <section v-else-if="kind === 'textarea'" class="review__editable" aria-label="多行输入示例">
      <STextArea v-model="description" label="项目备注" description="输入简要说明，文本区域随内容增高。" start-icon="file"
        :rows="2" :max-rows="5" auto-grow :max-length="12" :status="descriptionStatus" required />
      <STextArea label="标题摘要" :rows="2" size="sm" :html-max-length="8" :max-length="10" description="此示例将原生输入限制为 8 个 UTF-16 单元。" />
      <div class="review__editable-columns">
        <STextArea label="只读交付记录" :rows="2" model-value="发布后会生成新的副本。" readonly />
        <STextArea label="等待载入" :rows="2" loading placeholder="读取团队备注" />
        <STextArea label="客户备注" :rows="2" disabled model-value="当前无可编辑权限。" disabled-message="该备注由客户维护。" />
        <STextArea label="交付提醒" :rows="2" :status="warning" />
      </div>
      <STextArea label="待检查的备注" :rows="2" :status="{ type: 'error' }" />
    </section>

    <section v-else class="review__editable" aria-label="数字用法示例">
      <SNumberField v-model="percent" label="交付完成率" :min="0" :max="100" units="%" clearable clear-label="清除完成率"
        description="输入 0 到 100，超出范围的数字会取最接近的边界。" hide-controls-on-touch />
      <SForm @submit="submitGuests">
        <SNumberField v-model="guests" label="评审人数" name="guests" :min="1" :max="50" integer-only required units="人"
          :status="numberError ? { type: 'error', message: '请输入有效的整数人数。' } : undefined"
          @entry-error-change="numberError = $event" />
        <div class="review__row"><SButton size="sm" type="submit">确认人数</SButton><SButton size="sm" type="reset" variant="secondary">恢复人数</SButton></div>
      </SForm>
      <SNumberField v-model="speed" label="预览倍速" :min="0.5" :max="2" :step="0.25" :format-value="formatSpeed" size="sm" start-icon="clock" />
      <div class="review__editable-columns">
        <SNumberField label="超出预算" :model-value="120" :status="{ type: 'error', message: '预计费用需要复核。', live: 'off' }" hide-controls />
        <SNumberField label="接近上限" :model-value="9" :status="warning" hide-controls />
        <SNumberField label="已核对数量" :model-value="24" :status="success" hide-controls />
      </div>
      <SMotionText :value="result" announce />
    </section>
  </I18nProvider>
</template>
