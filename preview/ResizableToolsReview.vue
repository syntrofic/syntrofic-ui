<script setup lang="ts">
import { ref, useId, useTemplateRef } from 'vue'
import { SButton, SDisclosure, SResizeHandle, SSelect, SSwitch, SMotionText, percent, pixel, useResizable } from '../src'

const basis = useTemplateRef<HTMLElement>('basis')
const narrower = ref(false)
const collapseMode = ref(false)
const expanded = ref<boolean>()
const record = ref('')
const id = useId() + '-resizable-files'
const { files, details } = useResizable(() => ({
  containerRef: basis, autoSaveId: 'resize-review',
  regions: {
    files: {
      defaultSize: percent(40, { min: pixel(200) }),
      minSize: '20%' as const,
      maxSize: percent(70, { max: pixel(390) }),
      snaps: [200, 224, 260, 310], collapsible: true, collapsedLabel: '已收起',
      isCollapsed: collapseMode.value ? expanded.value === false : undefined,
      onCollapseChange: (closed: boolean) => {
        record.value = closed ? '主区域已收起' : '主区域已展开'
        expanded.value = !closed
      },
    },
    details: { defaultSize: '24%' as const, minSize: pixel(55) },
  },
}))
const { props: handle, size: filePixels, isCollapsed } = files
const { size: detailPixels } = details
const shortId = useId() + '-resizable-short'
const limitHeight = ref(true)
const short = useResizable(() => ({
  direction: 'vertical', defaultSize: 12, minSize: 6, maxSize: limitHeight.value ? 96 : undefined,
}))
const position = ref<'inline' | 'overlay'>('inline')
const pillPlacement = ref<'auto' | 'start' | 'center' | 'end' | 'custom'>('center')
const alwaysVisible = ref(false)
const positions = [{ value: 'inline', label: '占用布局空间' }, { value: 'overlay', label: '覆盖面板边缘' }]
const placements = [
  { value: 'auto', label: '自动' }, { value: 'start', label: '起端' },
  { value: 'center', label: '居中' }, { value: 'end', label: '末端' }, { value: 'custom', label: '自定义标记' },
]
const nativeHandle = useTemplateRef<HTMLElement>('native-handle')
const nativeFrame = useTemplateRef<HTMLElement>('native-frame')
const nativeId = useId()
const nativeKey = ref(0)
const nativeDisabled = ref(false)
const native = useResizable(() => ({
  handleRef: nativeHandle, containerRef: nativeFrame, controls: nativeId, label: '调整资料导航宽度',
  disabled: nativeDisabled.value, defaultSize: 112, minSize: 80, maxSize: percent(80, { max: pixel(208) }),
  snaps: [112, 160, 208], collapsible: true, collapsedLabel: '导航已收起', autoSaveId: 'native-resize-review',
}))
</script>

<template>
  <section class="resizable-tools-review" aria-label="可调整区域工具">
    <div class="review__row">
      <SButton variant="secondary" size="sm" @click="narrower = !narrower">调整参考容器</SButton>
      <SButton variant="secondary" size="sm" @click="isCollapsed ? files.expand() : files.collapse()">
        <SMotionText :value="isCollapsed ? '展开主区域' : '收起主区域'" />
      </SButton>
      <SButton variant="secondary" size="sm" @click="files.resize(294)">设为 294 像素</SButton>
      <label><input v-model="collapseMode" type="checkbox"> 外部控制</label>
    </div>
    <p :id="id + '-stops'" class="resizable-tools-review__hint">尺寸依次吸附到 200、224、260 和 310 像素。方向键移动一档，Shift 加方向键移动两档。</p>
    <div ref="basis" class="resizable-tools-review__surface" :style="{ width: narrower ? '320px' : '480px' }">
      <div :id="id" class="resizable-tools-review__pane" :style="{ width: filePixels + 'px' }" :inert="isCollapsed">文件区域</div>
      <SResizeHandle v-bind="handle" edge="start" label="调整主区域宽度" :controls="id"
        :always-visible="false" pill-placement="end"
        :aria-describedby="id + '-stops'"
        :style="{ insetInlineStart: filePixels + 'px' }" class="resizable-tools-review__handle" />
    </div>
    <div class="review__row">
      <output aria-label="主区域宽度"><SMotionText :value="String(Math.round(filePixels))" motion="roll" /></output>
      <output aria-label="详情区域宽度"><SMotionText :value="String(Math.round(detailPixels))" motion="roll" /></output>
      <output v-if="record" aria-label="区域状态"><SMotionText :value="record" appear /></output>
    </div>
    <div class="review__row">
      <SSelect v-model="position" :options="positions" label="短面板分隔条位置" />
      <SSelect v-model="pillPlacement" :options="placements" label="短面板把手位置" />
      <SSwitch v-model="alwaysVisible">始终显示短面板把手</SSwitch>
      <SSwitch v-model="limitHeight">将短面板限高为 96 px</SSwitch>
    </div>
    <div class="resizable-tools-review__short">
      <div class="resizable-tools-review__short-frame">
        <div :id="shortId" class="resizable-tools-review__short-pane" :style="{ height: short.size.value + 'px' }" />
        <SResizeHandle :resizable="short" :controls="shortId" label="调整短面板高度"
          :position="position" :pill-placement="pillPlacement === 'custom' ? 'center' : pillPlacement" :always-visible="alwaysVisible">
          <template v-if="pillPlacement === 'custom'" #default><span class="resizable-tools-review__mark" aria-hidden="true" /></template>
        </SResizeHandle>
      </div>
    </div>
    <output aria-label="短面板高度"><SMotionText :value="Math.round(short.size.value) + ' px'" motion="roll" /></output>
    <SDisclosure title="原生分隔条" variant="plain">
      <section class="resizable-tools-review__native" aria-label="原生分隔条示例">
        <div class="review__row">
          <SSwitch v-model="nativeDisabled">禁用原生分隔条</SSwitch>
          <SButton size="sm" variant="secondary" @click="nativeKey++">更换分隔条元素</SButton>
        </div>
        <div ref="native-frame" class="resizable-tools-review__native-frame"
          :style="{ '--native-pane-size': native.size.value + 'px' }">
          <div :id="nativeId" class="resizable-tools-review__pane" :inert="native.isCollapsed.value">资料导航</div>
          <div :key="nativeKey" ref="native-handle" class="resizable-tools-review__native-handle">
            <span class="resizable-tools-review__native-mark" aria-hidden="true" />
          </div>
          <div class="resizable-tools-review__native-main">发布记录</div>
        </div>
        <output aria-label="资料导航宽度"><SMotionText :value="Math.round(native.size.value) + ' px'" motion="roll" /></output>
      </section>
    </SDisclosure>
  </section>
</template>

<style scoped>
.resizable-tools-review { display: grid; grid-template-columns: minmax(0, 1fr); gap: 10px; min-inline-size: 0; }
.resizable-tools-review__surface {
  position: relative;
  display: flex;
  max-inline-size: 100%;
  min-block-size: 5rem;
  overflow: hidden;
  border-radius: var(--sy-radius-md);
  background: var(--sy-surface-muted);
}
.resizable-tools-review__pane { display: grid; flex: none; place-items: center; overflow: hidden; white-space: nowrap; background: var(--sy-surface-sage); }
.resizable-tools-review__handle { inset-inline-end: auto; translate: -50% 0; }
.resizable-tools-review__handle:dir(rtl) { translate: 50% 0; }
.resizable-tools-review__surface:not(:has([data-dragging])) .resizable-tools-review__pane { transition: width var(--sy-motion-replace) var(--sy-ease-settle); }
.resizable-tools-review__surface:not(:has([data-dragging])) .resizable-tools-review__handle { transition: inset-inline-start var(--sy-motion-replace) var(--sy-ease-settle); }
.resizable-tools-review__hint { margin: 0; color: var(--sy-text-muted); font-size: .8rem; }
.resizable-tools-review__short { padding: var(--sy-space-5); min-height: 110px; border-radius: var(--sy-radius-md); background: var(--sy-surface-muted); }
.resizable-tools-review__short-frame { position: relative; max-width: 20rem; }
.resizable-tools-review__short-pane { border-radius: var(--sy-radius-sm); background: var(--sy-surface-sage); }
.resizable-tools-review__mark { display: block; width: 18px; height: 3px; border-radius: var(--sy-radius-pill); background: var(--sy-accent); }
.resizable-tools-review__native { display: grid; gap: var(--sy-space-2); }
.resizable-tools-review__native-frame {
  display: grid;
  grid-template-columns: var(--native-pane-size) 16px minmax(0, 1fr);
  min-block-size: 64px;
  overflow: hidden;
  border-radius: var(--sy-radius-md);
  background: var(--sy-surface-muted);
}
.resizable-tools-review__native-frame:not(:has([data-dragging])) {
  transition: grid-template-columns var(--sy-motion-replace) var(--sy-ease-settle);
}
.resizable-tools-review__native-handle {
  display: grid;
  place-items: center;
  cursor: col-resize;
  outline-offset: -2px;
  transition: background-color var(--sy-duration) var(--sy-ease-settle);
}
.resizable-tools-review__native-handle:is(:hover, :focus-visible, [data-dragging]):not([aria-disabled]) { background: var(--sy-accent-soft); }
.resizable-tools-review__native-handle:focus-visible { outline: 2px solid var(--sy-focus); outline-offset: -2px; }
.resizable-tools-review__native-handle[aria-disabled] { cursor: default; }
.resizable-tools-review__native-mark { width: 3px; height: 20px; border-radius: var(--sy-radius-pill); background: var(--sy-border-strong); }
.resizable-tools-review__native-main { display: grid; place-items: center; min-width: 0; padding: var(--sy-space-2); }
.resizable-tools-review__short-frame:not(:has([data-dragging])) .resizable-tools-review__short-pane {
  transition: height var(--sy-motion-replace) var(--sy-ease-settle);
}
@media (prefers-reduced-motion: reduce) {
  .resizable-tools-review__native-frame:not(:has([data-dragging])), .resizable-tools-review__native-handle { transition: none; }
  .resizable-tools-review__surface:not(:has([data-dragging])) :is(.resizable-tools-review__pane, .resizable-tools-review__handle),
  .resizable-tools-review__short-frame:not(:has([data-dragging])) .resizable-tools-review__short-pane { transition: none; }
}
</style>
