<script setup lang="ts">
import { computed, ref } from 'vue'
import { SButton, SCellColorPicker, SCellSelect, SCellSlider, SCellSwitch, SInlineSelect, SMotionText, SNativeSelect } from '../src'
import type { ColorValue, SelectOption } from '../src'

defineProps<{ id: string }>()
const palette = [
  { color: '#718373', label: '苔绿' }, { color: '#8193A5', label: '雾蓝' },
  { color: '#A18579', label: '陶土' }, { color: '#C4AE89', label: '浅麦色' },
  { color: '#89849B', label: '灰紫' },
]
const locales: SelectOption[] = [
  { value: 'zh', label: '简体中文', group: '可用语言' }, { value: 'en', label: 'English', group: '可用语言' },
  { value: 'ja', label: '日本語', group: '可用语言' }, { value: 'fr', label: 'Français', group: '候补语言', disabled: true },
]
const fonts = [
  { value: 'system', label: '系统字体' }, { value: 'serif', label: '衬线字体' },
  { value: 'mono', label: '等宽字体' },
]
const topics = [
  { value: 'design', label: '设计' }, { value: 'product', label: '产品' }, { value: 'editorial', label: '内容' },
]
const cadence = ref('daily')
const cadences = [
  { value: 'daily', label: '每天' }, { value: 'weekly', label: '每周一次' }, { value: 'monthly', label: '每月一次' },
]
const accent = ref<ColorValue | null>('#718373')
const marker = ref<ColorValue | null>('#8193A5')
const language = ref('zh')
const font = ref('system')
const volume = ref(65)
const columns = ref(4)
const reminders = ref(true)
const reports = ref(false)
const selected = ref(['design'])
const timezone = ref('')
const receipt = ref('')
const attempted = ref(false)
const timezoneError = computed(() => attempted.value && !timezone.value ? '请选择时区。' : undefined)
const percent: Intl.NumberFormatOptions = { style: 'unit', unit: 'percent' }

function submit(event: SubmitEvent) {
  const data = new FormData(event.currentTarget as HTMLFormElement)
  receipt.value = '已保存 ' + (locales.find(item => item.value === data.get('lang'))?.label ?? '') + ' · ' + String(data.get('timezone'))
}
</script>

<template>
  <div v-if="id === 'WP.cell-color-picker'" class="settings-review" role="group" aria-label="外观设置">
    <SCellColorPicker v-model="accent" label="品牌主题色" :colors="palette" :show-alpha="false"
      field-label="颜色代码" slider-label="色相" area-label="色彩范围" palette-label="预设配色"
      apply-label="应用颜色" cancel-label="取消颜色修改" />
    <SCellColorPicker v-model="marker" label="标注颜色" variant="secondary" :colors="palette"
      field-label="颜色代码" slider-label="色相" area-label="色彩范围" alpha-label="透明度"
      palette-label="预设配色" apply-label="应用颜色" cancel-label="取消颜色修改" />
    <SCellColorPicker label="归档标记" model-value="#89849B" disabled />
  </div>
  <div v-else-if="id === 'WP.cell-select'" class="settings-review" role="group" aria-label="界面设置">
    <SCellSelect v-model="language" label="界面语言" :options="locales" />
    <SCellSelect v-model="font" label="正文字体" variant="secondary" :options="fonts">
      <template #value="{ text, selected: fontKey }">
        <span :class="'settings-review__font--' + fontKey"><SMotionText :value="text" /></span>
      </template>
    </SCellSelect>
    <SCellSelect model-value="zh" label="工作区默认语言" :options="locales" disabled />
  </div>
  <div v-else-if="id === 'WP.cell-slider'" class="settings-review" role="group" aria-label="播放与布局设置">
    <SCellSlider v-model="volume" label="提醒音量" :min="0" :max="100" :step="5" :format-options="percent" locale="zh-CN" />
    <SCellSlider v-model="columns" label="列表列数" :min="1" :max="8" variant="secondary">
      <template #value="{ text }"><SMotionText :value="text" motion="roll" /> 列</template>
    </SCellSlider>
    <SCellSlider :model-value="80" label="管理员音量" :format-options="percent" disabled />
  </div>
  <form v-else-if="id === 'WP.cell-switch'" class="settings-review" aria-label="通知设置">
    <SCellSwitch v-model="reminders" name="reminders" label="到期提醒" description="在任务到期前发送通知。" />
    <SCellSwitch v-model="reports" name="reports" label="每周简报" description="汇总本周的工作区动态。" variant="secondary" />
    <SCellSwitch :model-value="true" label="账户安全通知" description="由组织策略管理。" disabled />
    <div class="review__row"><SButton type="reset" variant="secondary" size="sm">恢复通知设置</SButton></div>
  </form>
  <div v-else-if="id === 'WP.inline-select'" class="settings-review settings-review--inline">
    <p>摘要按 <SInlineSelect v-model="cadence" label="发送频率" :options="cadences" width="6rem" /> 发送。</p>
    <p>包含 <SInlineSelect v-model="selected" label="包含主题" :options="topics" multiple width="9.5rem" locale="zh-CN" side="top">
      <template #indicator="{ open }"><span class="settings-review__indicator" :data-open="open" aria-hidden="true">⌄</span></template>
    </SInlineSelect> 主题。</p>
    <p>归档通知使用 <SInlineSelect label="归档频率" model-value="monthly" :options="cadences" width="6rem" disabled />。</p>
  </div>
  <form v-else class="settings-review settings-review--native" aria-label="系统选择表单"
    @submit.prevent="submit" @reset="attempted = false; receipt = ''">
    <SNativeSelect v-model="language" name="lang" label="首选语言" description="语言列表由系统选择控件打开。"
      :options="locales" full-width />
    <SNativeSelect v-model="timezone" name="timezone" label="工作时区" placeholder="选择一个时区" variant="secondary" full-width
      :options="[{ value: 'UTC+08:00', label: '上海 UTC+08:00' }, { value: 'UTC+09:00', label: '东京 UTC+09:00' }]"
      :error="timezoneError" required @invalid="attempted = true">
      <template #indicator>⌄</template>
    </SNativeSelect>
    <SNativeSelect label="历史语言" model-value="en" :options="locales" disabled />
    <div class="review__row">
      <SButton type="submit" size="sm">保存偏好</SButton>
      <SButton type="reset" variant="secondary" size="sm">重置偏好</SButton>
    </div>
    <p class="review__result"><SMotionText :value="receipt" announce /></p>
  </form>
</template>
