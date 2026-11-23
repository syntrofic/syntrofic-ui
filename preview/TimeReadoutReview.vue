<script setup lang="ts">
import { ref } from 'vue'
import { SButton, SSelect, STimer, STimestamp, STypography, type TimestampFormat, type TypographyColor } from '../src'
import I18nProvider from '../src/rac/I18nProvider.vue'

defineProps<{ kind: 'timer' | 'timestamp' }>()
const now = Date.now()
const start = ref(now - 3_753_000)
const shortStart = now - 128_000
const instant = '2026-03-21T10:15:00Z'
const zone = ref('Asia/Shanghai')
const zones = [{ value: 'Asia/Shanghai', label: '上海' }, { value: 'America/New_York', label: '纽约' }, { value: 'UTC', label: '协调世界时' }]
const formats: readonly { format: TimestampFormat; label: string }[] = [
  { format: 'date', label: '日期' }, { format: 'date_time', label: '日期和时间' }, { format: 'time', label: '时刻' },
  { format: 'system_date', label: '系统日期' }, { format: 'system_date_time', label: '系统日期和时间' }, { format: 'system_time', label: '系统时刻' },
]
const colors: readonly { color: TypographyColor; label: string }[] = [
  { color: 'primary', label: '正文' }, { color: 'secondary', label: '次要信息' },
  { color: 'disabled', label: '不可用' }, { color: 'accent', label: '强调' },
]
const moments = [
  { label: '刚更新的记录', seconds: 18 }, { label: '评审上传', seconds: 480 }, { label: '资源生成', seconds: 14_400 },
  { label: '上次交接', seconds: 172_800 }, { label: '归档记录', seconds: 5_184_000 },
]
</script>

<template>
  <section v-if="kind === 'timer'" class="review__editable" aria-label="计时器用法">
    <dl class="readout-examples">
      <div><dt>紧凑时长</dt><dd><STimer :start-time="start" locale="zh-CN" data-timer-elapsed /></dd></div>
      <div><dt>计时读数</dt><dd><STimer :start-time="start" format="clock" type="body" color="primary" weight="semibold" data-timer-clock /></dd></div>
    </dl>
    <div class="review__row"><SButton size="sm" variant="secondary" @click="start = Date.now()">重新计时</SButton></div>
    <STypography as="p" type="body" color="primary" weight="semibold">构建仍在运行，已等待 <STimer type="inherit" color="inherit" locale="zh-CN" data-timer-inline />。</STypography>
    <dl class="readout-examples">
      <div><dt>默认字号</dt><dd><STimer :start-time="shortStart" locale="zh-CN" /></dd></div>
      <div><dt>强调读数</dt><dd><STimer :start-time="shortStart" locale="zh-CN" type="large" size="xl" color="accent" weight="bold" /></dd></div>
    </dl>
  </section>

  <section v-else class="review__editable" aria-label="时间戳用法">
    <div class="review__row" role="group" aria-label="时区对照">
      <STimestamp :value="instant" format="date_time" locale="zh-CN" time-zone="Asia/Shanghai" color="accent" weight="bold" size="sm"
        :tooltip-entries="[{ label: '北京时间' }, { label: '协调世界时', timeZone: 'UTC', format: 'system_date_time', copyable: true }]"
        copy-label="复制" copied-label="已复制" />
      <I18nProvider locale="en-US" calendar="persian">
        <STimestamp :value="instant" format="date" time-zone="UTC" data-timestamp-calendar />
      </I18nProvider>
      <STimestamp :value="instant" format="system_date_time" time-zone="UTC" data-timestamp-system />
    </div>
    <SSelect v-model="zone" label="显示时区" :options="zones" />
    <dl class="readout-examples" aria-label="时间戳格式">
      <div v-for="entry in formats" :key="entry.format">
        <dt>{{ entry.label }}</dt>
        <dd><STimestamp :value="instant" :format="entry.format" :time-zone="zone" locale="en-US" show-time-zone :tooltip="false" :data-format="entry.format" /></dd>
      </div>
    </dl>
    <dl class="readout-examples" aria-label="时间戳颜色">
      <div v-for="entry in colors" :key="entry.color"><dt>{{ entry.label }}</dt>
        <dd><STimestamp :value="instant" format="time" locale="zh-CN" time-zone="Asia/Shanghai" :color="entry.color" :tooltip="false" /></dd>
      </div>
    </dl>
    <dl class="readout-examples" aria-label="相对时间">
      <div v-for="moment in moments" :key="moment.seconds"><dt>{{ moment.label }}</dt>
        <dd><STimestamp :value="(now / 1000) - moment.seconds" :live="moment.seconds === moments[0].seconds" format="relative" locale="zh-CN" /></dd>
      </div>
    </dl>
    <dl class="readout-examples" aria-label="自动选择格式">
      <div><dt>近期数据</dt><dd><STimestamp :value="(now / 1000) - 120" locale="zh-CN" time-zone="UTC" :tooltip="false" data-auto="recent" /></dd></div>
      <div><dt>较早的数据</dt><dd><STimestamp :value="(now / 1000) - 1_728_000" locale="zh-CN" time-zone="UTC" :tooltip="false" data-auto="older" /></dd></div>
    </dl>
  </section>
</template>

<style scoped>
.readout-examples { display: grid; gap: var(--sy-space-1); margin: 0; }
.readout-examples > div { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 11rem), 1fr)); align-items: baseline;
  gap: 4px var(--sy-space-3); padding: var(--sy-space-2) var(--sy-space-3); background: var(--sy-surface-muted); border-radius: var(--sy-radius-sm); }
.readout-examples dt { font-size: .8125rem; color: var(--sy-text-muted); }
.readout-examples dd { margin: 0; min-inline-size: 0; }
</style>
