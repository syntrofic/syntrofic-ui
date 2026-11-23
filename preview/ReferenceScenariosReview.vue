<script setup lang="ts">
import { ref } from 'vue'
import { SAvatar, SButton, SChatSource, SHoverCard, SInfoTip, SMotionText, type ChatSourceInfo } from '../src'

defineProps<{ kind: 'citation' | 'hover' | 'info' }>()
const metrics = [
  { label: '按时交付率', value: '94%', detail: '按约定时间完成的交付数除以到期交付总数。', size: 'sm' },
  { label: '待复核文件', value: '12', detail: '已提交且尚未完成复核的文件数。', size: 'xsm' },
  { label: '平均响应时间', value: '4.2 小时', detail: '过去 30 天从收到请求到首次回复的平均时间。', size: 'md' },
] as const
const settings = [
  { label: '归档保留期', value: '180 天', detail: '只有工作区管理员可以修改归档保留期。' },
  { label: '品牌文件权限', value: '团队成员', detail: '品牌资料库的所有者可以调整查看范围。' },
]
const profile = ref(false)
const sources: ChatSourceInfo[] = [
  { id: 'index', title: '发布文件索引', href: '#交付引用目录', description: '记录本次发布所需的源文件和交付格式。' },
  { id: 'rule', title: '文件命名规则', href: '#交付命名规则', description: '按版本和语言组织最终交付的文件。' },
  { id: 'note', title: '内部复核备注', type: 'document', description: '记录尚需确认的签名和版本。' },
]
const sourceIcons = ['file', 'book', 'archive']
function citationName(number: number, title: string) { return '引用 ' + number + ' · ' + title }
</script>

<template>
  <section v-if="kind === 'info'" class="reference-scenarios" aria-label="指标和权限说明">
    <dl class="reference-scenarios__metrics">
      <div v-for="item in metrics" :key="item.label" class="reference-scenarios__metric">
        <dt>{{ item.label }} <SInfoTip :label="'了解' + item.label" :size="item.size" :text="item.detail" /></dt>
        <dd><SMotionText :value="item.value" /></dd>
      </div>
    </dl>
    <dl class="reference-scenarios__settings">
      <div v-for="setting in settings" :key="setting.label">
        <dt>{{ setting.label }} <SInfoTip :label="'了解' + setting.label + '权限'">{{ setting.detail }}</SInfoTip></dt>
        <dd>{{ setting.value }}</dd>
      </div>
    </dl>
  </section>
  <section v-else-if="kind === 'hover'" class="reference-scenarios" aria-label="术语和链接预览">
    <p>审阅者可通过
      <SHoverCard label="交付快照说明" :interactive="false" arrow>
        <template #trigger="{ triggerProps }">
          <button type="button" v-bind="triggerProps" class="reference-scenarios__term">交付快照</button>
        </template>
        <p>交付快照记录发布时的文件版本和评审状态。</p>
      </SHoverCard>
      核对这次提交，也能先查看
      <SHoverCard label="发布材料索引预览">
        <template #trigger="{ triggerProps }"><a v-bind="triggerProps" href="#发布材料索引">发布材料索引</a></template>
        <div class="reference-scenarios__preview">
          <strong>发布材料索引</strong>
          <p>按品牌、文案和源文件分类列出交付内容。</p>
          <a href="#发布材料索引">查看发布材料索引</a>
        </div>
      </SHoverCard>。
    </p>
    <div class="review__row">
      <SButton size="sm" variant="secondary" :aria-pressed="profile" @click="profile = !profile">显隐维护者预览</SButton>
      <SHoverCard v-if="profile" label="发布维护者预览" trigger-label="发布维护者" default-open>
        <div class="reference-scenarios__preview">
          <SAvatar name="方以" initials="方" :tooltip="false" />
          <strong>方以</strong>
          <p>管理发布版本、文件索引和交付记录。</p>
        </div>
      </SHoverCard>
    </div>
    <div id="发布材料索引" tabindex="-1">
      <h3>发布材料索引</h3>
      <p>包含品牌资源、校对稿及最终发布清单。</p>
    </div>
  </section>
  <section v-else class="reference-scenarios" aria-label="数字引文和资料索引">
    <p class="reference-scenarios__inline">
      发布前按文件索引核对源文件<SChatSource :source="sources[0]" variant="number" :number="1" :number-label="citationName" />，
      并检查最终文件名<SChatSource :source="sources[1]" variant="number" :number="2" :number-label="citationName" />。
      签名复核记录在<SChatSource :source="sources[2]" variant="number" :number="3" :number-label="citationName" />中。
    </p>
    <div id="交付引用目录" tabindex="-1">
      <h3>交付引用目录</h3>
      <ol class="reference-scenarios__sources">
        <li v-for="(source, index) in sources" :key="source.id">
          <SChatSource :source="source" :icon="sourceIcons[index]" document-label="内部资料" />
        </li>
      </ol>
    </div>
    <p id="交付命名规则" tabindex="-1">最终发布文件需注明版本和语言。</p>
  </section>
</template>

<style scoped>
.reference-scenarios, .reference-scenarios__preview { display: grid; gap: var(--sy-space-3); min-inline-size: 0; }
.reference-scenarios :where(h3, p, dd, dl) { margin: 0; }
.reference-scenarios__metrics {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(min(9rem, 100%), 1fr)); gap: var(--sy-space-2);
}
.reference-scenarios__metric { display: grid; gap: var(--sy-space-1); padding: var(--sy-space-2); }
.reference-scenarios dt { font-weight: 600; }
.reference-scenarios__metric dd { font-size: 1.35rem; font-weight: 680; }
.reference-scenarios__settings { display: grid; gap: var(--sy-space-2); }
.reference-scenarios__settings > div { display: flex; justify-content: space-between; gap: var(--sy-space-2); flex-wrap: wrap; align-items: center; }
.reference-scenarios__term {
  border: 0; background: transparent; color: var(--sy-accent-text); font: inherit; padding: 0;
  text-decoration: underline dotted; text-underline-offset: .15em; cursor: help;
}
.reference-scenarios__preview { padding: var(--sy-space-3); max-inline-size: 17rem; }
.reference-scenarios__inline .sy-chat-source { margin-inline: .2em; }
.reference-scenarios__sources { margin: var(--sy-space-2) 0; padding-inline-start: 1.65rem; display: grid; gap: var(--sy-space-2); }
</style>
