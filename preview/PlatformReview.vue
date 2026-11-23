<script setup lang="ts">
import { computed, ref } from 'vue'
import parity from '../catalog/parity.json'
import implementation from '../catalog/implementation.json'
import { SButton, SCode, SImage, SInput, SMotionText, SAgentPanel, SSnippet, SSpacer, SUser, SWorkspaceTemplate, SProductivityWorkspace, type WorkArea, type WorkspaceTemplateKind } from '../src'
import ThemeWorkspace from './ThemeWorkspace.vue'
import BuilderReview from './BuilderReview.vue'
import WorkspaceOpsReview from './WorkspaceOpsReview.vue'
import VariantReview from './VariantReview.vue'
import AgentExamplesReview from './AgentExamplesReview.vue'
import AgentStudioReview from './AgentStudioReview.vue'
import ProAccessReview from './ProAccessReview.vue'
import SuiteServicesReview from './SuiteServicesReview.vue'
import { reviewAgentNode } from './agent-review'
import deliveryArea from './assets/delivery-area.png'

const props = defineProps<{ selected: string }>()
const records = parity.platform.map((item, index) => ({ ...item, number: String(340 + index) }))
const active = computed(() => records.find(item => item.id === props.selected))
const themeKinds = new Set(['DS-01', 'DS-03', 'DS-04', 'DS-06', 'DS-07', 'DS-08', 'DS-09', 'DS-10', 'DS-11'])
const query = ref('')
const seen = ref(false)
const components = [...parity.components, ...parity.packageExports]
const matches = computed(() => components.filter(item => !query.value || [item.id, item.name, item.track].some(value =>
  value.toLowerCase().includes(query.value.toLowerCase()))).slice(0, 12))
const templates: Record<string, WorkspaceTemplateKind> = { 'T-W1':'dashboard', 'T-W2':'mail', 'T-W3':'chat', 'T-W4':'crm', 'T-W5':'finances' }
const commands = {
  'DX-03': ['syntrofic init vue --out ./demo', 'syntrofic init --native --out ./native-demo', 'syntrofic doctor --out ./demo', 'syntrofic docs export --out ./docs'],
  'DX-04': ['syntrofic docs export --out ./docs', 'node scripts/platform/mcp.mjs', 'node scripts/platform/docs-server.mjs'],
}
const suiteAreas:Record<string,WorkArea>={'S-01':'up-next','S-03':'inbox','S-04':'calendar','S-05':'crm','S-08':'inbox'}
const suiteServices:Record<string,'connectors'|'mcp'|'models'|'team'>={'S-02':'connectors','S-06':'mcp','S-07':'models','S-09':'team'}
const agentSample = { version: 1, nodes: [reviewAgentNode('kpi-grid')] }
const commandList = computed(() => active.value ? commands[active.value.id as keyof typeof commands] ?? [] : [])
</script>
<template>
  <div class="workbench">
    <header class="workbench__top"><a class="workbench__brand" href="./">Syntrofic UI</a><a href="?platform=all">平台能力</a></header>
    <main class="workbench__main">
      <article v-if="active" :data-platform-review="active.id">
        <h1>{{ active.number }} {{ active.name }}</h1>
        <ThemeWorkspace v-if="themeKinds.has(active.id)" />
        <section v-else-if="active.id === 'DS-02'" class="sy-agent-card">
          <h2>独立样式入口</h2>
          <code>@syntrofic/ui-styles/tokens.css</code><code>@syntrofic/ui-styles/components/components.css</code>
          <code>@syntrofic/ui-styles/cdn.css</code><code>@syntrofic/ui-styles/tailwind.css</code>
          <button class="sy-button" type="button" data-variant="secondary" @click="seen = !seen">原生 HTML 按钮</button>
          <SMotionText v-if="seen" value="按钮已触发" announce />
        </section>
        <section v-else-if="active.id === 'DX-02'" class="sy-agent-card">
          <h2>迁移命令</h2>
          <code>syntrofic migrate ./src/legacy.vue --dry-run</code>
          <code>syntrofic migrate ./src/legacy.vue --write</code>
          <pre>import { Code } from '@syntrofic/ui'
import { SCode as Code } from '@syntrofic/ui'</pre>
          <p>报告包含组件映射和需要移植的 JSX。</p>
        </section>
        <ProAccessReview v-else-if="active.id === 'DX-05' || active.id === 'DX-06' || active.id === 'DX-07'"
          :mode="active.id === 'DX-05' ? 'docs' : active.id === 'DX-06' ? 'install' : 'license'" />
        <section v-else-if="active.id === 'DX-08'" class="sy-agent-card">
          <h2>项目与贡献</h2>
          <ul>
            <li><a href="https://gitlab.syntrofic.com/syntrofic/syntrofic-ui/-/blob/main/CONTRIBUTING.md">贡献指南与支持入口</a></li>
            <li><a href="https://gitlab.syntrofic.com/syntrofic/syntrofic-ui/-/issues/new?issuable_template=Component%20report">报告组件问题</a></li>
            <li><a href="?platform=T-W1">模板展示</a> · <a href="?platform=S-01">工作台展示</a></li>
            <li><a href="https://gitlab.syntrofic.com/syntrofic/syntrofic-ui/-/blob/main/docs/community-and-roadmap.md">路线图与企业接入</a></li>
            <li><a href="https://gitlab.syntrofic.com/syntrofic/syntrofic-ui/-/blob/main/CHANGELOG.md">版本记录</a></li>
          </ul>
        </section>
        <SProductivityWorkspace v-else-if="suiteAreas[active.id]" :area="suiteAreas[active.id]" :advanced="active.id==='S-08'" />
        <SuiteServicesReview v-else-if="suiteServices[active.id]" :mode="suiteServices[active.id]" />
        <VariantReview v-else-if="active.id === 'DX-09'" />
        <AgentStudioReview v-else-if="active.id === 'A-02' || active.id === 'A-03' || active.id === 'A-06'"
          :panel="active.id === 'A-02' ? 'agents' : active.id === 'A-03' ? 'knowledge' : 'events'" />
        <AgentExamplesReview v-else-if="active.id === 'A-07'" />
        <BuilderReview v-else-if="active.id === 'B-01' || active.id === 'B-02'" />
        <WorkspaceOpsReview v-else-if="active.id === 'B-03' || active.id === 'B-04' || active.id === 'A-04'"
          :mode="active.id === 'B-03' ? 'exports' : active.id === 'B-04' ? 'usage' : 'approval'" />
        <SAgentPanel v-else-if="active.id === 'A-01' || active.id === 'A-05'" :document="agentSample"
          label="交付助手" welcome="核对本周材料。" placement="sidebar" :open="true" />
        <section v-else-if="active.id === 'DX-01' || active.id === 'DX-04'" class="sy-agent-card">
          <SInput label="查组件" v-model="query" />
          <ul><li v-for="entry in matches" :key="entry.id">
            <a v-if="entry.track.startsWith('web')" :href="'?component=' + entry.id">{{ entry.name }}</a>
            <span v-else>{{ entry.name }}</span> · {{ entry.id }}
          </li></ul>
          <pre v-if="commandList.length"><code>{{ commandList.join('\n') }}</code></pre>
        </section>
        <section v-else-if="commandList.length" class="sy-agent-card">
          <h2>脚手架与诊断</h2>
          <pre><code>{{ commandList.join('\n') }}</code></pre>
          <SButton variant="secondary" size="sm" @click="seen = !seen">查看安装选项</SButton>
          <SMotionText v-if="seen" value="支持 pnpm、npm、yarn 和 bun，使用 --source 指定私有包版本。" />
        </section>
        <SWorkspaceTemplate v-else-if="templates[active.id]" :kind="templates[active.id]" />
        <p v-else-if="active.id === 'legacy-component.code'">执行 <SCode>pnpm check:catalog</SCode> 检查清单。</p>
        <SImage v-else-if="active.id === 'legacy-component.image'" :src="deliveryArea" alt="配送区域示意图" :width="350" caption="配送服务范围" />
        <SSnippet v-else-if="active.id === 'legacy-component.snippet'" value="pnpm check:catalog" copy-label="复制" copied-label="已复制" error-label="复制失败" />
        <div v-else-if="active.id === 'legacy-component.spacer'"><p>交付说明</p><SSpacer :size="26" /><p>材料清单</p></div>
        <SUser v-else-if="active.id === 'legacy-component.user'" name="林舟" description="负责品牌规范" />
        <p v-else>{{ active.criteria }}</p>
      </article>
      <template v-else>
        <h1>平台能力</h1>
        <ul><li v-for="item in records" :key="item.id">
          <a :href="'?platform=' + item.id">{{ item.number }} {{ item.name }}</a>
          <small v-if="!Object.hasOwn(implementation, item.id)"> · 待验收</small>
        </li></ul>
      </template>
    </main>
  </div>
</template>
