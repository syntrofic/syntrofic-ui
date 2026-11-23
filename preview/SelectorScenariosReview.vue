<script setup lang="ts">
import { computed, ref } from 'vue'
import { SButton, SForm, SIcon, SInputGroup, SMotionText, SSelect, STable, SToolbar, SToolbarButton, type SelectOption, type TableColumn } from '../src'
import I18nProvider from '../src/rac/I18nProvider.vue'

const visibilities: readonly SelectOption[] = [
  { value: 'private', label: '邀请成员', icon: 'lock', description: '只有收到邀请的人可以访问。' },
  { value: 'team', label: '项目团队', icon: 'users', description: '团队成员可以查看并参与讨论。' },
  { value: 'public', label: '公开' },
]
const permissions: readonly SelectOption[] = [
  { value: 'files', label: '浏览文件', group: '读取权限' },
  { value: 'history', label: '查看历史', group: '读取权限' },
  { value: 'comment', label: '发表评论', group: '编辑权限' },
  { value: 'upload', label: '上传文件', group: '编辑权限' },
  { value: 'archive', label: '删除归档', group: '管理权限', disabled: true },
]
const columns = [
  { value: 'title', label: '名称' }, { value: 'owner', label: '负责人' },
  { value: 'updated', label: '更新时间' }, { value: 'phase', label: '发布阶段' },
]
const files = [
  { title: '品牌手册', owner: '林舟', updated: '11 月 12 日', phase: '已发布' },
  { title: '新手模板', owner: '许然', updated: '11 月 16 日', phase: '草稿' },
]
const visible = ref(['title', 'owner', 'updated'])
const tableColumns = computed<TableColumn<(typeof files)[number]>[]>(() => columns
  .filter(column => visible.value.includes(column.value))
  .map(column => ({ key: column.value, label: column.label, rowHeader: column.value === 'title',
    value: row => row[column.value as keyof (typeof files)[number]] })))
const concise = ref('private')
const rich = ref('private')
const grouped = ref('private')
const saved = ref('')
const sheetSingle = ref('team')
const sheetMulti = ref(['files'])
const view = ref('team')
const filters = ref(['files'])
const toolbarResult = ref('')
const problem = ref<string>()
const pendingReview = ref('public')
const confirmed = ref('team')
const roles = ref<string[]>([])
const extraRoles = ref<string[]>([])
const permissionsResult = ref('')
function savePermissions(_: SubmitEvent, data: FormData) {
  const selected = new Set([...data.getAll('permissions'), ...data.getAll('extra')])
  permissionsResult.value = permissions.filter(permission => selected.has(permission.value)).map(permission => permission.label).join('、')
}
</script>

<template>
  <I18nProvider locale="zh-CN" :messages="{ 'field.optional': '选填' }" class="review__stack selector-scenarios">
    <section aria-label="选择器选项说明" class="review__stack">
      <h3>访问范围</h3>
      <div class="review__columns">
        <SSelect v-model="concise" label="默认单行值" :options="visibilities" />
        <SSelect v-model="rich" label="带说明的值" :options="visibilities" show-selected-description />
      </div>
      <SInputGroup label="在输入组中设置访问范围">
        <SSelect v-model="grouped" label="组合访问范围" hide-label :options="visibilities" show-selected-description />
        <template #end>
          <SButton size="sm" @click="saved = visibilities.find(option => option.value === grouped)?.label ?? ''">保存范围</SButton>
        </template>
      </SInputGroup>
      <output aria-label="已保存的范围"><SMotionText :value="saved" /></output>
    </section>
    <section aria-label="底部面板选择" class="review__stack">
      <h3>底部面板</h3>
      <div class="review__columns">
        <SSelect v-model="sheetSingle" label="移动端访问范围" :options="visibilities" presentation="bottom-sheet"
          panel-title="选择访问范围" dismiss-label="关闭" />
        <SSelect v-model="sheetMulti" label="移动端权限" :options="permissions" presentation="bottom-sheet" multiple
          panel-title="选择权限" dismiss-label="完成选择" locale="zh-CN" />
      </div>
    </section>
    <section aria-label="选择器校验" class="review__stack">
      <h3>选择校验</h3>
      <SSelect v-model="problem" label="交付范围" placeholder="请选择" :options="visibilities" required
        :status="problem ? { type: 'success', message: '交付范围已指定。', live: 'off' } : { type: 'error', message: '请选择交付范围。', live: 'off' }" />
      <SSelect v-model="pendingReview" label="对外发布" :options="visibilities"
        :status="pendingReview === 'public' ? { type: 'warning', message: '公开前请检查文件权限。', live: 'off' } : undefined" />
      <SSelect v-model="confirmed" label="默认权限" :options="visibilities"
        :status="{ type: 'success', message: '权限配置已通过检查。', live: 'off', variant: 'detached' }" />
    </section>
    <section aria-label="选择器工具栏" class="review__stack">
      <h3>文件工具栏</h3>
      <SToolbar label="文件显示方式" size="sm" surface="muted">
        <template #start>
          <SSelect v-model="view" label="可见文件" hide-label variant="ghost" :options="visibilities" />
          <SSelect v-model="filters" label="权限筛选" hide-label variant="ghost" multiple :options="permissions" locale="zh-CN"
            placeholder="选择权限">
            <template #value><SMotionText :value="`权限 ${filters.length}`" motion="roll" /></template>
          </SSelect>
        </template>
        <template #end>
          <SToolbarButton label="应用文件筛选" @click="toolbarResult = `应用了 ${filters.length} 项权限筛选`">
            <template #start><SIcon name="check" /></template>
          </SToolbarButton>
        </template>
      </SToolbar>
      <output aria-label="筛选结果"><SMotionText :value="toolbarResult" /></output>
    </section>
    <section aria-label="表格列选择" class="review__stack">
      <h3>表格列</h3>
      <SSelect v-model="visible" label="可见列" hide-label variant="ghost" multiple searchable select-all :options="columns"
        presentation="adaptive" search-label="筛选列名" select-all-label="全选当前结果" empty-text="没有匹配的列" dismiss-label="完成">
        <template #value><SMotionText :value="`可见列 ${visible.length} / ${columns.length}`" motion="roll" /></template>
      </SSelect>
      <STable v-if="tableColumns.length" :columns="tableColumns" :rows="files" :row-key="row => row.title" label="交付文件" />
      <p v-else class="sy-field__hint">选择要显示的列。</p>
    </section>
    <section aria-label="多选表单" class="review__stack">
      <h3>成员权限</h3>
      <SForm @submit="savePermissions" @reset="permissionsResult = ''">
        <SSelect v-model="roles" name="permissions" label="基本权限" required required-message="请选择至少一项基本权限。"
          multiple searchable select-all clearable :options="permissions"
          placeholder="请选择权限" locale="zh-CN" search-label="搜索权限" select-all-label="全选匹配权限" empty-text="没有匹配的权限" clear-label="清除基本权限" />
        <SSelect v-model="extraRoles" name="extra" label="附加权限" optional multiple :options="permissions"
          placeholder="添加权限" locale="zh-CN" />
        <div class="review__row">
          <SButton size="sm" type="submit">保存成员权限</SButton>
          <SButton size="sm" variant="secondary" type="reset">恢复初始权限</SButton>
        </div>
        <output aria-label="已保存的权限"><SMotionText :value="permissionsResult" /></output>
      </SForm>
    </section>
  </I18nProvider>
</template>

<style scoped>
.selector-scenarios { gap: var(--sy-space-5); }
.selector-scenarios > section { inline-size: 100%; min-inline-size: 0; justify-items: stretch; }
.selector-scenarios h3 { margin: 0 0 var(--sy-space-2); }
.selector-scenarios output:empty { display: none; }
</style>
