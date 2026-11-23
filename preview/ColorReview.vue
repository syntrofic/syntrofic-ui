<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  SButton, SColorArea, SColorField, SColorInputGroup, SColorPicker, SColorSlider,
  SColorSwatch, SColorSwatchPicker, SForm, SInput, SMotionText, SSelect, SSwitch, STextField,
} from '../src'
import type { ColorFormat, ColorValue } from '../src'
import { formatColor, readColor } from '../src/internal/color'

defineProps<{ id: string }>()
const preset = { color: '#859589', label: '灰绿' }
const palette = [
  preset, { color: '#8D9FAE', label: '雾蓝' }, { color: '#BC9C97', label: '陶粉' },
  { color: '#AB9A7E', label: '浅赭' }, { color: '#B5AE9E8A', label: '半透明暖灰' },
  { color: '#C1BEBA', label: '浅灰', disabled: true },
]
const color = ref<ColorValue | null>(preset.color)
const text = ref('#8D9FAE')
const format = ref<string | undefined>('hex')
const stack = ref(false)
const result = ref('')
const display = computed(() => {
  const parsed = readColor(color.value)
  return parsed ? formatColor(parsed) : '未选颜色'
})
const entered = computed(() => readColor(text.value))
const formats = [
  { value: 'hex', label: 'HEX' }, { value: 'rgb', label: 'RGB' },
  { value: 'hsl', label: 'HSL' }, { value: 'hsb', label: 'HSB' },
]

function saved(_: SubmitEvent, data: FormData) {
  result.value = String(data.get('color') ?? '')
}
</script>

<template>
  <div v-if="id === 'W.color-area'" class="review__stack review__color-control">
    <SColorArea v-model="color" label="二维调色区" locale="zh-CN" />
    <div class="review__row">
      <SColorSwatch :color="color" label="当前颜色" size="sm" />
      <SMotionText class="review__result" :value="display" motion="roll" />
    </div>
  </div>

  <SForm v-else-if="id === 'W.color-field'" class="review__color-control" @submit="saved" @reset="result = ''; format = 'hex'">
    <SSelect v-model="format" label="颜色格式" :options="formats" />
    <SColorField v-model="color" name="color" label="颜色代码" :format="(format ?? 'hex') as ColorFormat" invalid-label="请输入有效的颜色值。" required />
    <SColorField v-model="color" channel="red" label="红色通道" locale="zh-CN" :show-swatch="false" invalid-label="请输入有效的数值。" />
    <div class="review__row">
      <SButton type="submit" size="sm">保存色值</SButton>
      <SButton type="reset" size="sm" variant="ghost">重置</SButton>
    </div>
    <p v-if="result" class="review__result" aria-live="polite">已保存 {{ result }}</p>
  </SForm>

  <div v-else-if="id === 'W.color-picker'" class="review__stack">
    <SColorPicker
      v-model="color"
      label="选择品牌色"
      done-label="完成"
      locale="zh-CN"
      :colors="palette"
      area-label="调色区"
      slider-label="色相"
      alpha-label="不透明度"
      field-label="颜色代码"
      palette-label="品牌色板"
    />
    <SMotionText class="review__result" :value="display" motion="roll" />
  </div>

  <div v-else-if="id === 'W.color-slider'" class="review__stack review__color-control">
    <SColorSlider v-model="color" channel="hue" locale="zh-CN" color-space="hsb" />
    <SColorSlider v-model="color" channel="alpha" locale="zh-CN" />
    <div class="review__row">
      <SColorSwatch :color="color" label="当前颜色" size="sm" />
      <SMotionText class="review__result" :value="display" motion="roll" />
    </div>
  </div>

  <div v-else-if="id === 'W.color-swatch'" class="review__row review__color-samples">
    <div class="review__row"><SColorSwatch color="#859589" label="灰绿" size="lg" />灰绿</div>
    <div class="review__row"><SColorSwatch color="#B5AE9E8A" label="半透明暖灰" size="lg" />半透明暖灰</div>
    <div class="review__row"><SColorSwatch :color="null" empty-label="无颜色" size="lg" />无颜色</div>
  </div>

  <div v-else-if="id === 'W.color-swatch-picker'" class="review__stack">
    <SColorSwatchPicker v-model="color" :colors="palette" label="品牌色板" :layout="stack ? 'stack' : 'grid'" shape="square" />
    <SSwitch v-model="stack">列表布局</SSwitch>
    <SMotionText class="review__result" :value="display" motion="roll" />
  </div>

  <div v-else class="review__stack review__color-control">
    <STextField label="自定义颜色" :error="!entered && text ? '请输入有效的色值。' : undefined">
      <SColorInputGroup :invalid="!entered && Boolean(text)">
        <template #start><SColorSwatch :color="entered" size="xs" aria-hidden="true" /></template>
        <SInput v-model="text" autocomplete="off" spellcheck="false" />
        <template #end>HEX</template>
      </SColorInputGroup>
    </STextField>
  </div>
</template>

<style scoped>
.review__color-control { inline-size: min(100%, 22rem); }
.review__color-control :is(.sy-color-area, .sy-color-slider, .sy-field) { inline-size: 100%; }
.review__color-control .sy-color-area { box-sizing: border-box; padding-inline: 8px; }
.review__color-samples { gap: 10px 18px; }
</style>
