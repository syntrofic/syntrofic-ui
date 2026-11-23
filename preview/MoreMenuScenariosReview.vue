<script setup lang="ts">
import { ref } from 'vue'
import { SButton, SInput, SMoreMenu, SMotionText, type MenuEntry } from '../src'

const name = ref('品牌发布清单')
const draft = ref('')
const editing = ref(false)
const archived = ref(false)
const pinned = ref(false)
const message = ref('')
const basic: MenuEntry[] = [{ id: 'rename', label: '重命名' }, { id: 'pin', label: '切换置顶' }]
const partitioned: MenuEntry[] = [...basic, { id: 'line', kind: 'separator' },
  { id: 'archive', label: '移到归档', tone: 'danger' }]
const organized: MenuEntry[] = [
  { id: 'work', kind: 'section', label: '编辑与整理', items: basic },
  { id: 'lifecycle', kind: 'section', label: '文档状态', items: [{ id: 'archive', label: '移到归档', tone: 'danger' }] },
]

function action(id: string) {
  if (id === 'rename') {
    draft.value = name.value
    editing.value = true
  } else if (id === 'pin') {
    pinned.value = !pinned.value
    message.value = pinned.value ? '已置顶文档' : '已取消置顶'
  } else if (id === 'archive') {
    archived.value = true
    message.value = '已归档文档'
  }
}
function save() {
  if (draft.value.trim()) name.value = draft.value.trim()
  editing.value = false
  message.value = '已保存文档名称'
}
function restore() {
  archived.value = false
  message.value = '已恢复文档'
}
</script>

<template>
  <section class="more-menu-review" aria-label="文档更多操作">
    <div class="more-menu-review__row">
      <div>
        <strong><SMotionText :value="name" /></strong>
        <p role="status"><SMotionText :value="archived ? '已归档' : pinned ? '已置顶 · 内容待复核' : '内容待复核'" /></p>
      </div>
      <div class="review__row more-menu-review__actions">
        <SMoreMenu label="快捷操作" :items="basic" @action="action" />
        <SMoreMenu label="含分隔线的操作" :items="partitioned" @action="action" />
        <SMoreMenu label="分组操作" :items="organized" @action="action" />
        <SMoreMenu label="底部操作面板" :items="partitioned" presentation="bottom-sheet" dismiss-label="完成" @action="action" />
        <SButton v-if="archived" size="sm" variant="secondary" @click="restore">恢复文档</SButton>
      </div>
    </div>
    <form v-if="editing && !archived" class="more-menu-review__editor" @submit.prevent="save">
      <SInput label="文档名称" v-model="draft" required />
      <SButton size="sm" type="submit">保存名称</SButton>
    </form>
    <output aria-label="文档操作结果"><SMotionText :value="message" /></output>
  </section>
</template>

<style scoped>
.more-menu-review { display: grid; gap: var(--sy-space-2); min-inline-size: 0; }
.more-menu-review__row { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: var(--sy-space-2); padding: var(--sy-space-2) var(--sy-space-3); background: var(--sy-surface-subtle); border-radius: var(--sy-radius-md); }
.more-menu-review__row p { margin: 0; color: var(--sy-text-muted); font-size: .9375rem; }
.more-menu-review__actions { row-gap: 3px; }
.more-menu-review__editor { display: grid; gap: 6px; grid-template-columns: minmax(0, 1fr) auto; align-items: end; }
</style>
