<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  SButton, SCommand, SCommandEmpty, SCommandFooter, SCommandGroup, SCommandItem, SCommandList,
  SIcon, SKbd, SMotionText, SSwitch, type CommandItem,
} from '../src'
import I18nProvider from '../src/rac/I18nProvider.vue'

const files: CommandItem[] = [
  { id: 'brief', label: '发布清单', icon: 'file', group: '交付资料', description: '品牌手册与发布检查项' },
  { id: 'draft', label: '发布草稿', icon: 'file', group: '交付资料', description: '审核中的发布文稿' },
  { id: 'tokens', label: '颜色令牌', icon: 'file', group: '设计系统', description: '主题色值与命名' },
  { id: 'motion', label: '动画规范', icon: 'book', group: '设计系统', description: '录入动效的准则' },
  { id: 'accounts', label: '账户权限', icon: 'lock', group: '工作区', description: '仅管理员可调整', disabled: true },
  { id: 'archive', label: '交付归档', icon: 'folder', group: '交付资料', children: [
    { id: 'reports', items: [{ id: 'review-report', label: '评审记录' }] },
  ] },
]
const online = ref(true)
const result = ref('')
function searchFiles(query: string, signal: AbortSignal) {
  return new Promise<readonly CommandItem[]>((resolve, reject) => {
    let timer: ReturnType<typeof setTimeout>
    function cancel() { clearTimeout(timer); resolve([]) }
    timer = setTimeout(() => {
      signal.removeEventListener('abort', cancel)
      if (!online.value) reject(new Error('File search unavailable'))
      else resolve(files.filter(item => item.label.includes(query) || item.description?.includes(query)))
    }, query.length === 1 ? 520 : 340)
    signal.addEventListener('abort', cancel, { once: true })
  })
}
const commands: CommandItem[] = [
  { id: 'calendar', label: '查看排期', group: '项目导航', icon: 'calendar', keywords: ['schedule', 'timeline'], shortcut: ['alt', 'G'] },
  { id: 'members', label: '查找团队成员', group: '项目导航', icon: 'users', keywords: ['people', 'directory'], shortcut: ['alt', 'U'] },
  { id: 'duplicate', label: '复制发布模板', group: '文件操作', icon: 'copy', keywords: ['duplicate', 'template'], shortcut: ['alt', 'D'] },
]
const formats: CommandItem[] = [
  { id: 'summary', label: '概览视图' }, { id: 'compact', label: '紧凑视图' }, { id: 'detail', label: '详细视图' },
]
const format = ref('summary')
const chosenFormat = computed(() => formats.find(item => item.id === format.value)?.label ?? '')
const paletteOpen = ref(false)
const standalone = ref('records')
const shortcuts = [
  { id: 'dashboard', label: '打开交付首页', icon: 'home' },
  { id: 'settings', label: '修改自动发布设置', icon: 'wrench', disabled: true },
  { id: 'records', label: '查看交付记录', icon: 'folder' },
  { id: 'review', label: '创建评审', icon: 'plus' },
  { id: 'duplicate', label: '复制交付清单', icon: 'copy' },
  { id: 'send', label: '查看发送队列', icon: 'file' },
]
const messages = { 'command.move': '移动', 'command.select': '选择', 'command.dismiss': '关闭' }
function selectItem(item: CommandItem) { result.value = '已选择' + item.label }
</script>

<template>
  <I18nProvider locale="zh-CN" :messages="messages" :as="false">
    <section class="command-scenarios" aria-label="命令面板搜索与选择">
      <section class="command-scenarios__panel" aria-label="异步文件搜索">
        <h3>文件搜索</h3>
        <SSwitch v-model="online">文件目录在线</SSwitch>
        <SCommand title="目录搜索面板" input-label="查找文件" list-label="目录搜索结果" placeholder="输入文件名或内容" inline :shortcut="false"
          :search="searchFiles" :search-delay="0" clear-label="清除" back-label="返回目录搜索" bootstrap-text="输入文件名开始搜索。" loading-text="正在读取文件目录…"
          empty-text="未找到文件。" error-text="文件目录暂不可用。连接后可重新搜索。" @select="selectItem" />
      </section>
      <section class="command-scenarios__panel" aria-label="分组工作台命令">
        <h3>工作台命令</h3>
        <SCommand title="工作台搜索面板" :items="commands" input-label="筛选工作台命令" list-label="工作台命令结果"
          placeholder="按名称或关键字搜索" inline :shortcut="false" clear-label="清除" show-separators empty-text="没有匹配的工作台命令。" @select="selectItem">
          <template #item="{ item }">
            <SIcon :name="item.icon" size="sm" />
            <span class="sy-command__item-copy"><SMotionText :value="item.label" /></span>
            <SKbd :keys="item.shortcut" />
          </template>
          <template #footer>可输入英文关键字，例如 schedule。</template>
        </SCommand>
      </section>
      <div class="review__row">
        <SCommand v-model:open="paletteOpen" v-model="format" picker title="选择表格视图" input-label="搜索表格视图"
          :items="formats" :shortcut="false" dismiss-label="关闭">
          <template #trigger="{ open, expanded }">
            <SButton size="sm" variant="secondary" :aria-expanded="expanded" aria-haspopup="dialog" @click="open">选择查看方式</SButton>
          </template>
        </SCommand>
        <p aria-live="polite"><SMotionText :value="chosenFormat" /></p>
      </div>
      <section class="command-scenarios__panel" aria-label="手动组合命令列表">
        <h3>组合命令列表</h3>
        <SCommandList label="文件命令" separators>
          <SCommandGroup label="导航">
            <SCommandItem v-for="item in shortcuts.slice(0, 3)" :key="item.id" :item="item" :active="item.id === standalone"
              :selected="item.id === standalone" indicator @select="standalone = item.id; selectItem(item)" />
          </SCommandGroup>
          <SCommandGroup label="操作">
            <SCommandItem v-for="item in shortcuts.slice(3)" :key="item.id" :item="item" :selected="item.id === standalone"
              indicator @select="standalone = item.id; selectItem(item)" />
          </SCommandGroup>
        </SCommandList>
        <SCommandFooter />
      </section>
      <section class="command-scenarios__panel" aria-label="没有命令时的提示">
        <SCommandEmpty>当前工作区还没有收藏的命令。</SCommandEmpty>
      </section>
      <p aria-label="命令选择结果" aria-live="polite"><SMotionText :value="result" /></p>
    </section>
  </I18nProvider>
</template>

<style scoped>
.command-scenarios { display: grid; gap: var(--sy-space-3); min-inline-size: 0; }
.command-scenarios h3, .command-scenarios p { margin: 0; }
.command-scenarios__panel { display: grid; gap: var(--sy-space-2); padding: var(--sy-space-3); border: 1px solid var(--sy-border); border-radius: var(--sy-radius-md); min-inline-size: 0; }
</style>
