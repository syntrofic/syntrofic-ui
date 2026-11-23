import { Comment, Fragment, Text, defineComponent, h, type VNode } from 'vue'
import { labelDirection } from './label-direction'

function plainText(nodes: VNode[]): string | undefined {
  let text = ''
  for (const node of nodes) {
    if (node.type === Comment) continue
    const part = node.type === Text && typeof node.children === 'string' ? node.children
      : node.type === Fragment && Array.isArray(node.children) ? plainText(node.children as VNode[]) : undefined
    if (part === undefined) return
    text += part
  }
  return text
}

export default defineComponent({
  name: 'SInlineLabel',
  inheritAttrs: false,
  props: { text: [String, Number], keepRichLayout: Boolean },
  setup(props, { attrs, slots }) {
    return () => {
      const children = slots.default?.()
      const text = children ? plainText(children) : props.text
      if (props.keepRichLayout && children && text === undefined) return children
      return h('span', { dir: labelDirection(text), 'data-sy-plain-label': text === undefined ? undefined : '', ...attrs },
        children ?? String(props.text ?? ''))
    }
  },
})
