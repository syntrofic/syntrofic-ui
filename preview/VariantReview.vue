<script setup lang="ts">
import { computed, ref } from 'vue'
import { SButton, SSwitch, createVariants } from '../src'
const compact = ref(false)
const subdued = ref(false)
const recipe = createVariants({
  base: { root:'rounded-md px-3 py-2 bg-sy-surface', label:'text-sm font-medium' },
  variants: {
    density:{ compact:{root:'px-2 py-1',label:'text-xs'}, normal:{root:'px-4 py-2.5',label:'text-sm'} },
    subdued:{ true:{root:'bg-sy-canvas'}, false:{root:'bg-sy-surface'} },
  },
  defaults:{ density:'normal', subdued:false },
  compounds:[{ when:{density:'compact',subdued:true},classes:{label:'font-normal'} }],
})
const result = computed(() => recipe({ density:compact.value?'compact':'normal', subdued:subdued.value },
  { responsive:{sm:{density:'normal'}},class:{root:'px-6'} }))
</script>

<template>
  <section class="sy-agent-card">
    <div class="sy-agent-actions"><SSwitch v-model="compact">紧凑</SSwitch><SSwitch v-model="subdued">低对比表面</SSwitch></div>
    <dl>
      <div><dt>容器类名</dt><dd><code>{{ result.className }}</code></dd></div>
      <div><dt>标签类名</dt><dd><code>{{ result.slot('label') }}</code></dd></div>
    </dl>
    <SButton size="sm" variant="secondary" :class="result.className"><span :class="result.slot('label')">归档材料</span></SButton>
  </section>
</template>
