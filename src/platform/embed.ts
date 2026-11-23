import { createApp, h, shallowReactive } from 'vue'
import SAgentPanel from './SAgentPanel.vue'
import type { AgentActionEvent } from '../agent-ui/schema'

export interface AgentEmbedOptions {
  document: unknown
  label?: string
  welcome?: string
  placement?: 'inline' | 'floating' | 'sidebar'
  theme?: 'light' | 'dark' | 'system'
  font?: string
  onAction?: (event: AgentActionEvent) => void
}

export function mountAgentPanel(target: string | HTMLElement, initial: AgentEmbedOptions) {
  const root = typeof target === 'string' ? document.querySelector(target) : target
  if (!root) throw new Error('Agent panel mount target was not found')
  const state = shallowReactive({ ...initial })
  const app = createApp({ render: () => h(SAgentPanel, state) })
  app.mount(root)
  return { update: (options: Partial<AgentEmbedOptions>) => Object.assign(state, options), unmount: () => app.unmount() }
}
