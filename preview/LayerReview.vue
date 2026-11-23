<script setup lang="ts">
import { defineComponent, h, ref } from 'vue'
import { SButton, SLayerProvider, SPopover, useLayer, useToast, type LayerAlignment, type LayerPlacement } from '../src'

const rtl = ref(false)
const vertical = ref(false)
const edge = ref(false)
const placement = ref<LayerPlacement>('below')
const align = ref<LayerAlignment>('start')
const anchored = useLayer({ lightDismiss: true, lazyMount: true })
const fixed = useLayer({ mode: 'fixed' })
const custom = useLayer()
const AnchoredContent = defineComponent(() => () => anchored.render(() => h('p', '跟随锚点、阅读方向与视口边缘。'), {
  label: '锚定图层', placement: placement.value, align: align.value, offset: '0.5rem', style: { color: 'var(--layer-review-ink)' },
}))
const FixedContent = defineComponent(() => () => fixed.render(() => h(SButton, { onClick: fixed.hide, size: 'sm' }, () => '关闭坐标图层'), {
  label: '坐标图层', x: 45, y: 80,
}))
const CustomContent = defineComponent(() => () => custom.render(() => h(SButton, { onClick: custom.hide, size: 'sm' }, () => '关闭自定义图层'), {
  label: '自定义图层', positioning: 'custom', style: { top: 'anchor(bottom)', left: 'anchor(left)', marginTop: '8px' },
}))
const ProviderActions = defineComponent(() => {
  const announce = useToast()
  const layer = useLayer({ lightDismiss: true })
  const atEdge = ref(false)
  const nearCorner = { position: 'fixed', right: '3px', bottom: '3px', zIndex: 5 }
  return () => h('div', { class: 'review__row' }, [
    h(SButton, { size: 'sm', variant: 'secondary', onClick: () => { atEdge.value = !atEdge.value } }, () => '切换边缘避让锚点'),
    h('button', { ref: layer.ref, type: 'button', class: 'sy-button', 'data-size': 'sm', 'data-variant': 'secondary',
      style: atEdge.value ? nearCorner : undefined, onClick: () => layer.show() }, '打开避让图层'),
    layer.render('图层避开固定栏。', { label: '避让图层' }),
    h(SPopover, { label: '避让菜单', align: 'end' }, {
      trigger: () => h(SButton, { size: 'sm', variant: 'secondary', style: atEdge.value ? { ...nearCorner, bottom: '150px' } : undefined }, () => '打开避让菜单'),
      default: () => h('p', '菜单避开固定栏。'),
    }),
    h(SButton, { size: 'sm', variant: 'secondary', onClick: () => announce({ body: '布局设置已应用', isAutoHide: false }) }, () => '发送图层通知'),
  ])
})
</script>

<template>
  <section class="layer-review" aria-label="图层定位示例">
    <div class="review__row">
      <label><input v-model="rtl" type="checkbox"> 从右到左</label>
      <label><input v-model="vertical" type="checkbox"> 竖排</label>
      <label><input v-model="edge" type="checkbox"> 贴近视口底部</label>
      <label>锚点方向
        <select v-model="placement">
          <option value="above">块轴起点</option>
          <option value="below">块轴终点</option>
          <option value="start">行轴起点</option>
          <option value="end">行轴终点</option>
        </select>
      </label>
      <label>对齐
        <select v-model="align">
          <option value="start">起点</option>
          <option value="center">居中</option>
          <option value="end">终点</option>
        </select>
      </label>
    </div>
    <section class="layer-review__scope" aria-label="局部样式">
      <p :dir="rtl ? 'rtl' : 'ltr'" :style="{ writingMode: vertical ? 'vertical-rl' : undefined }">
        <button :ref="anchored.ref" type="button" class="sy-button" data-size="sm" data-variant="secondary" :data-edge="edge || undefined"
          :aria-expanded="anchored.open.value" :aria-controls="anchored.id" @click="anchored.show()">显示锚定图层</button>
        <AnchoredContent />
      </p>
    </section>
    <div class="review__row">
      <SButton size="sm" variant="secondary" @click="fixed.show()">显示坐标图层</SButton>
      <FixedContent />
      <button :ref="custom.ref" type="button" class="sy-button" data-size="sm" data-variant="secondary"
        @click="custom.show()">显示自定义图层</button>
      <CustomContent />
    </div>
    <SLayerProvider :inset="{ blockEnd: 80, inlineEnd: 24 }"
      :toast="{ position: 'bottom-end', maxVisible: 2, inset: { inlineEnd: '3rem' }, viewportLabel: '图层通知' }">
      <SLayerProvider :inset="{ blockEnd: 120 }" :toast="{ position: 'top', viewportLabel: '内层通知' }">
        <ProviderActions />
      </SLayerProvider>
    </SLayerProvider>
  </section>
</template>

<style scoped>
.layer-review__scope {
  --layer-review-ink: rgb(38, 70, 103);
  overflow: hidden;
}
.layer-review__scope > p { margin: 0.5rem 0; }
.layer-review__scope [data-edge] { position: fixed; right: 3px; bottom: 3px; z-index: 5; }
</style>
