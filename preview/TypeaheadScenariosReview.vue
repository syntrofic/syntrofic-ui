<script setup lang="ts">
import { computed, ref, useTemplateRef } from 'vue'
import {
  SAutocomplete, SBaseTypeahead, SButton, SIcon, SKbd, SMotionText, SRadio, SRadioGroup, SSwitch,
  STypeaheadItem, type SelectOption,
} from '../src'
import { useQueryResults } from '../src/internal/query-results'

defineProps<{ itemsOnly?: boolean }>()
const assets: SelectOption[] = [
  { value: 'brief', label: '品牌手册', description: '设计组 · PDF', icon: 'file', endLabel: '2026' },
  { value: 'tokens', label: '颜色令牌', description: '设计系统 · JSON', icon: 'file', endLabel: '2026' },
  { value: 'frames', label: '品牌版式', description: '设计组 · 网格规范', icon: 'file' },
  { value: 'motion', label: '品牌动效', description: '设计系统 · 动效指南', icon: 'file' },
  { value: 'forms', label: '品牌表单', description: '体验组 · 表单样例', icon: 'file' },
]
const people: SelectOption[] = [
  { value: 'lin', label: '林舟', description: '视觉设计', avatar: { initials: '林' } },
  { value: 'xu', label: '许然', description: '前端工程', avatar: { initials: '许' } },
  { value: 'zhou', label: '周昱', description: '项目负责人', avatar: { initials: '周' } },
]
const person = ref('')
const validation = computed(() => person.value.trim() && !people.some(item => item.label === person.value.trim())
  ? { type: 'error' as const, message: '请选择目录中已有的同事。', live: 'off' as const } : undefined)
const searchAnchor = useTemplateRef<HTMLElement>('searchAnchor')
const filterAnchor = useTemplateRef<HTMLElement>('filterAnchor')
const filterSearch = useTemplateRef<InstanceType<typeof SBaseTypeahead>>('filterSearch')
const picked = ref('')
const unavailable = ref(false)
async function searchAssets(term: string, signal: AbortSignal) {
  await new Promise(resolve => setTimeout(resolve, 240))
  if (signal.aborted) return []
  if (unavailable.value) throw new Error('Archive unavailable')
  return assets.filter(item => item.label.includes(term) || item.description?.includes(term))
}
const assetQuery = ref('')
const assetOpen = ref(false)
const assetSearch = useQueryResults({ query: assetQuery, active: assetOpen, source: () => searchAssets, delay: 0 })
const assetOptions = computed(() => assetQuery.value.trim() ? assetSearch.results.value : assets)
const query = ref('')
const open = ref(false)
const definitions = [
  { value: 'status', label: '状态', description: '等待、执行或已完成', values: ['待开始', '进行中', '已完成'] },
  { value: 'priority', label: '优先级', description: '影响交付顺序', values: ['高', '中', '低'] },
  { value: 'owner', label: '负责人', description: '团队中的交付负责人', values: people.map(item => item.label) },
]
const editing = ref<(typeof definitions)[number]>()
const editValue = ref<string>()
const filters = ref<Record<string, string>>({})
function beginEdit(option: SelectOption, origin?: EventTarget | null) {
  editing.value = definitions.find(item => item.value === option.value)
  if (!editing.value) return
  editValue.value = filters.value[editing.value.value] ?? editing.value.values[0]
  filterSearch.value?.open(origin instanceof HTMLElement ? origin : undefined)
}
function apply(close: () => void) {
  if (editing.value && editValue.value) filters.value = { ...filters.value, [editing.value.value]: editValue.value }
  close()
}
</script>

<template>
  <section v-if="itemsOnly" class="typeahead-scenarios" aria-label="自动补全选项内容">
    <SAutocomplete label="带说明的文件选项" :options="assets" open-on-focus>
      <template #option="{ option }"><STypeaheadItem :item="option" /></template>
    </SAutocomplete>
    <SAutocomplete label="带头像的团队成员" :options="people" open-on-focus>
      <template #option="{ option }"><STypeaheadItem :item="option" /></template>
    </SAutocomplete>
  </section>
  <section v-else class="typeahead-scenarios" aria-label="自动补全用法">
    <div class="review__columns">
      <SAutocomplete v-model="assetQuery" v-model:open="assetOpen" label="查找交付资料" placeholder="输入主题"
        :options="assetOptions" remote :loading="assetSearch.pending.value" loading-text="正在读取交付资料…"
        :empty-text="assetSearch.failed.value ? '资料库不可用' : '未找到资料'" start-icon="search" open-on-focus :max-results="3"
        description="显示最相关的三项资料。" />
      <SAutocomplete v-model="person" label="通知同事" :options="people" :status="validation" required open-on-focus
        description="发布完成后会通知所选同事。" />
    </div>
    <SSwitch v-model="unavailable">模拟资料库不可用</SSwitch>
    <section class="typeahead-scenarios__case" aria-label="自定义资料搜索框">
      <h3>自定义资料搜索框</h3>
      <div ref="searchAnchor" class="typeahead-scenarios__field">
        <SIcon name="search" size="sm" />
        <SBaseTypeahead label="在资料库中检索" placeholder="搜索标题或说明" :options="assets" :anchor="searchAnchor" open-on-focus
          :search="searchAssets" :search-delay="0" loading-text="正在检索资料库…" empty-text="未找到资料" error-text="资料库不可用"
          @select="picked = $event.label">
          <template #option="{ option }">
            <STypeaheadItem :item="option">
              <template #end><span class="typeahead-scenarios__note">{{ option.endLabel ?? '文件' }}</span></template>
            </STypeaheadItem>
          </template>
        </SBaseTypeahead>
      </div>
      <output aria-label="资料选择结果"><SMotionText :value="picked" /></output>
    </section>
    <section class="typeahead-scenarios__case" aria-label="条件补全和编辑">
      <h3>条件补全和编辑</h3>
      <div ref="filterAnchor" class="typeahead-scenarios__field">
        <SIcon name="funnel" size="sm" />
        <SBaseTypeahead ref="filterSearch" v-model="query" v-model:open="open" label="添加搜索条件" :options="definitions"
          placeholder="搜索筛选维度" open-on-focus clear-on-select :anchor="filterAnchor"
          :menu-role="editing ? 'dialog' : 'listbox'" :menu-label="editing ? '编辑' + editing.label : '可用条件'"
          empty-text="未找到条件" @select="beginEdit" @update:open="visible => { if (!visible) editing = undefined }">
          <template #list-start="{ query: value }"><p class="typeahead-scenarios__note">{{ value ? '匹配「' + value + '」的条件' : '按字段筛选' }}</p></template>
          <template #list-end><p class="typeahead-scenarios__note"><SKbd :keys="['up', 'down']" separator="" /> 移动 <SKbd :keys="['enter']" /> 选择</p></template>
          <template #dialog="{ close }">
            <div v-if="editing" class="typeahead-scenarios__dialog">
              <SRadioGroup v-model="editValue" :label="editing.label">
                <SRadio v-for="value in editing.values" :key="value" :value="value">{{ value }}</SRadio>
              </SRadioGroup>
              <div class="review__row">
                <SButton size="sm" variant="secondary" @click="close()">取消修改</SButton>
                <SButton size="sm" @click="apply(close)">应用条件</SButton>
              </div>
            </div>
          </template>
        </SBaseTypeahead>
      </div>
      <div class="review__row">
        <SButton v-for="field in definitions.filter(item => filters[item.value])" :key="field.value"
          variant="secondary" size="sm" :aria-label="'编辑已应用的' + field.label" @click="beginEdit(field, $event.currentTarget)">
          <SMotionText :value="field.label + ' · ' + filters[field.value]" />
        </SButton>
      </div>
    </section>
  </section>
</template>

<style scoped>
.typeahead-scenarios, .typeahead-scenarios__case { display: grid; gap: var(--sy-space-3); min-inline-size: 0; }
.typeahead-scenarios h3 { margin: 0; }
.typeahead-scenarios__field {
  display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 6px; align-items: center; border: 1px solid var(--sy-border);
  border-radius: var(--sy-radius-md); padding: 4px 8px; background: var(--sy-canvas);
}
.typeahead-scenarios__note { margin: 0; padding: 4px 7px; font-size: .78rem; color: var(--sy-text-muted); }
.typeahead-scenarios__dialog { padding: 8px; display: grid; gap: 10px; }
</style>
