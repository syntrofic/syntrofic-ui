<script setup lang="ts">
import { defineComponent, h, ref, type PropType } from 'vue'
import { SButton, SLink, SLinkProvider, SMarkdown, useLinkComponent, type LinkDestination } from '../src'

const opened = ref('')
const record = Object.freeze({ path: '/projects/hand-off', query: { focus: 'resources' } })
function makeLink(name: string) {
  return defineComponent({
    name: `LinkRouteDemo-${name}`,
    inheritAttrs: false,
    props: {
      href: [String, Object] as PropType<LinkDestination>,
      to: [String, Object] as PropType<LinkDestination>,
    },
    setup(props, { attrs, slots }) {
      return () => {
        const destination = props.to ?? props.href
        const href = typeof destination === 'string' ? destination : String(destination?.path ?? '')
        return h('a', { ...attrs, href, 'data-router': name, 'data-same-location': String(destination === record),
          onClick(event: MouseEvent) { event.preventDefault(); opened.value = href },
        }, slots.default?.())
      }
    },
  })
}
const WorkspaceRoute = makeLink('workspace')
const DialogRoute = makeLink('dialog')
const SimpleFileLink = defineComponent({
  setup() {
    const Link = useLinkComponent()
    return () => h(Link, { href: '/docs/hand-off' }, () => '自定义文档链接')
  },
})
</script>

<template>
  <section class="review__stack" aria-label="链接路由示例">
    <SLinkProvider :component="WorkspaceRoute">
      <div class="review__row">
        <SLink href="/projects">路由项目</SLink>
        <SButton :to="record">交付资源</SButton>
        <SLink as="a" href="#native-demo">原生片段</SLink>
        <SLink href="/projects" :to="{ protocol: 'javascript:', path: '/archive' }">已拦截链接</SLink>
        <SLink href="/projects" disabled>未开放项目</SLink>
        <SimpleFileLink />
      </div>
      <SLinkProvider :component="DialogRoute"><SLink href="/settings">局部设置路由</SLink></SLinkProvider>
      <SMarkdown source="[Markdown 参考](/docs/reference)" />
    </SLinkProvider>
    <output id="native-demo">{{ opened }}</output>
  </section>
</template>
