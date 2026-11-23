<script setup lang="ts">
import { ref } from 'vue'
import { SButton, SEmojiPicker, SEmojiReactionButton, SMotionText, SNumberValue, SPressableFeedback, SRating, STrendChip, usePressFeedback, type EmojiChoice } from '../src'
import RatingHintHookReview from './RatingHintHookReview.vue'

defineProps<{ id: string }>()
const updated = ref(false)
const positive = ref(true)
const report = ref('')
const pressable = usePressFeedback()
const flipped = ref(false)
const percent: Intl.NumberFormatOptions = { style: 'percent', maximumFractionDigits: 1, signDisplay: 'exceptZero' }
const directions = { up: '上升', down: '下降', neutral: '持平' }
const rating = ref(3.5)
const customRating = ref(3)
const submittedRating = ref('')
const emojiChoice = ref('用鼠标或键盘选择')
const pickerRecent = ref(['👍', '✨', '🎉'])
const reactions = ref([
  { glyph: '👍', label: '赞', count: 99, selected: false },
  { glyph: '🎉', label: '庆祝', count: 12, selected: true },
  { glyph: '❤️', label: '红心', count: 4, selected: false },
])
const ratingLabel = (value: number, max: number) => `${value} / ${max} 分`
const reactionLabel = (label: string, count: number) => `${label}，${count} 个反应`

function saveRating(event: SubmitEvent) {
  submittedRating.value = '已提交 ' + String(new FormData(event.currentTarget as HTMLFormElement).get('rating')) + ' 分'
}

function addReaction(choice: EmojiChoice) {
  const existing = reactions.value.find(reaction => reaction.glyph === choice.glyph)
  if (!existing) {
    reactions.value.push({ ...choice, count: 1, selected: true })
  } else if (!existing.selected) {
    existing.selected = true
    existing.count++
  }
}
</script>

<template>
  <div v-if="id === 'WP.number-value'" class="review__stack">
    <dl class="feedback-showcase">
      <div><dt>本月收入</dt><dd><SNumberValue :value="updated ? 1001 : 999" locale="zh-CN" :formatOptions="{ style: 'currency', currency: 'CNY', maximumFractionDigits: 0 }" :reserve="8" /></dd></div>
      <div><dt>交付完成率</dt><dd><SNumberValue :value="updated ? .98 : .923" locale="zh-CN" :formatOptions="{ style: 'percent', minimumFractionDigits: 1 }" :reserve="8" /></dd></div>
      <div><dt>页面访问</dt><dd><SNumberValue :value="48261" locale="zh-CN" :formatOptions="{ notation: 'compact' }" /></dd></div>
      <div><dt>今日新增</dt><dd><SNumberValue :value="108" :formatOptions="{ signDisplay: 'always' }" suffix="个" /></dd></div>
      <div><dt>累计下载</dt><dd><SNumberValue :value="22500101" locale="de-DE" motion="none" /></dd></div>
      <div><dt>剩余储存</dt><dd><SNumberValue :value="256" :formatOptions="{ style: 'unit', unit: 'gigabyte', unitDisplay: 'short' }" /></dd></div>
      <div><dt>估算支出</dt><dd><SNumberValue :value="3867.24" prefix="约" suffix="元" :formatOptions="{ maximumFractionDigits: 1 }" /></dd></div>
      <div><dt>数据校验</dt><dd><SNumberValue :value="9007199254740993n" :reserve="17" /></dd></div>
    </dl>
    <SButton size="sm" variant="secondary" @click="updated = !updated">切换数据</SButton>
  </div>
  <div v-else-if="id === 'WP.trend-chip'" class="review__stack">
    <dl class="feedback-showcase">
      <div><dt>新增订阅</dt><dd><STrendChip :value="positive ? .074 : -.038" :formatOptions="percent" :directionLabels="directions" :reserve="5" suffix="较上周" /></dd></div>
      <div><dt>退款率</dt><dd><STrendChip :value="-.011" :formatOptions="percent" :directionLabels="directions" positive="down" variant="solid" /></dd></div>
      <div><dt>库存差异</dt><dd><STrendChip :value="0" :directionLabels="directions" suffix="件" variant="outline" /></dd></div>
      <div><dt>支持请求</dt><dd><STrendChip :value="12" :directionLabels="directions" :indicator="false" suffix="件" variant="plain" /></dd></div>
      <div><dt>处理时延</dt><dd><STrendChip :value="-4" :directionLabels="directions" positive="down" size="lg" suffix="毫秒" /></dd></div>
      <div><dt>回访增长</dt><dd><STrendChip :value="2" :directionLabels="directions" size="md" prefix="增加" suffix="家" /></dd></div>
    </dl>
    <SButton size="sm" variant="secondary" @click="positive = !positive">切换趋势</SButton>
  </div>
  <div v-else-if="id === 'WP.pressable-feedback'" class="review__stack">
    <div class="review__row">
      <SPressableFeedback as-child @click="report = '已保存'"><SButton variant="secondary">保存</SButton></SPressableFeedback>
      <SPressableFeedback as-child effect="ripple" @click="report = '已标记'"><SButton variant="secondary">从按压处扩散</SButton></SPressableFeedback>
      <SPressableFeedback as-child effect="scale" @click="report = '已添加'"><SButton variant="secondary">轻缩反馈</SButton></SPressableFeedback>
      <SPressableFeedback as-child disabled @click="report = '已删除'"><SButton variant="ghost">不可用操作</SButton></SPressableFeedback>
    </div>
    <div class="review__row">
      <SPressableFeedback as-child effect="hold" :duration="950" @complete="report = '已确认归档'">
        <SButton variant="danger">按住确认归档</SButton>
      </SPressableFeedback>
      <SPressableFeedback as-child effect="progress" sweep="up" :duration="680" @complete="report = '已完成校验'">
        <SButton variant="secondary">校验更新</SButton>
      </SPressableFeedback>
    </div>
    <p class="review__result"><SMotionText :value="report" announce /></p>
    <div class="review-touch-press" role="region" aria-label="滚动区域按压反馈">
      <button v-bind="pressable" type="button" class="sy-press-background" @click="report = '已查看交付记录'">查看交付记录</button>
      <p>项目资料、审核结果和交付说明。</p>
      <p>设计资源和开发验收记录。</p>
    </div>
    <button v-bind="pressable" class="sy-press-background hook-press-card" type="button" aria-label="翻转校验卡片"
      :aria-pressed="flipped" @click="flipped = !flipped">
      <SMotionText :value="flipped ? '复核完成 · 可以发布' : '交付复核 · 待确认'" />
    </button>
  </div>

  <div v-else-if="id === 'WP.rating'" class="review__stack">
    <form class="rating-showcase" @submit.prevent="saveRating" @reset="submittedRating = ''">
      <div class="rating-showcase__row">
        <span>编辑评分</span>
        <SRating v-model="rating" label="编辑评分" name="rating" :step=".5" :format-value="ratingLabel" clearable />
        <SNumberValue :value="rating" :reserve="3" :format-options="{ minimumFractionDigits: 1 }" />
      </div>
      <div class="rating-showcase__row">
        <span>平均评分</span>
        <SRating readonly :model-value="4.3" label="平均评分" :format-value="ratingLabel" />
        <SNumberValue :value="4.3" :reserve="3" />
      </div>
      <div class="rating-showcase__row">
        <span>自定义图形</span>
        <SRating v-model="customRating" label="自定义图形" size="sm" :count="4" :format-value="ratingLabel">
          <template #glyph>◆</template>
        </SRating>
        <SNumberValue :value="customRating" :reserve="3" />
      </div>
      <div class="rating-showcase__row">
        <span>评分已关闭</span>
        <SRating disabled :model-value="2" name="disabled-rating" label="评分已关闭" size="sm" :format-value="ratingLabel" />
      </div>
      <div class="review__row">
        <SButton size="sm" type="submit">提交评分</SButton>
        <SButton size="sm" type="reset" variant="secondary">恢复初始值</SButton>
      </div>
    </form>
    <p class="review__result"><SMotionText :value="submittedRating" announce /></p>
    <RatingHintHookReview />
  </div>
  <div v-else-if="id === 'WP.emoji-picker'" class="emoji-showcase">
    <SEmojiPicker v-model:recent="pickerRecent" inline locale="zh" @select="emojiChoice = $event.glyph + ' ' + $event.label" />
    <div class="review__stack">
      <div class="review__row">
        <SEmojiPicker v-model:recent="pickerRecent" locale="en" size="sm" label="打开浮层选择器"
          @select="emojiChoice = $event.glyph + ' ' + $event.label" />
      </div>
      <p class="review__result"><SMotionText :value="emojiChoice" announce /></p>
    </div>
  </div>
  <div v-else-if="id === 'WP.emoji-reaction-button'" class="review__stack">
    <article class="reaction-showcase">
      <p>品牌资源库已更新，插画和使用规范都已归档。</p>
      <TransitionGroup name="reaction-list" tag="div" class="review__row">
        <SEmojiReactionButton v-for="reaction in reactions" :key="reaction.glyph"
          v-model:selected="reaction.selected" v-model:count="reaction.count" :emoji="reaction.glyph" :label="reaction.label"
          :format-label="reactionLabel" />
        <span key="add">
          <SEmojiPicker locale="zh" size="sm" label="添加表情" @select="addReaction" />
        </span>
      </TransitionGroup>
    </article>
    <dl class="reaction-showcase__states">
      <div><dt>只读统计</dt><dd><SEmojiReactionButton readonly emoji="✨" label="闪光" :count="18" :format-label="reactionLabel" /></dd></div>
      <div><dt>已关闭</dt><dd><SEmojiReactionButton disabled emoji="🙌" label="举双手" :count="8" :format-label="reactionLabel" /></dd></div>
    </dl>
  </div>
</template>

<style scoped>
.hook-press-card { justify-self: start; padding: .75rem 1rem; min-block-size: 3rem; border: 1px solid var(--sy-border); border-radius: var(--sy-radius-md); background: var(--sy-canvas); color: inherit; cursor: pointer; font: inherit; }
.hook-press-card:focus-visible { outline: 2px solid var(--sy-focus); outline-offset: -2px; }
.review-touch-press { max-block-size: 5rem; max-inline-size: 16rem; overflow: auto; }
.review-touch-press button {
  padding: 8px 12px;
  border: 1px solid var(--sy-border);
  border-radius: var(--sy-radius-sm);
  background: var(--sy-surface);
  color: var(--sy-text);
  font: inherit;
  cursor: pointer;
}
</style>
