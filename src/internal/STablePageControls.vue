<script setup lang="ts">
import SButton from '../components/SButton.vue'
import SMotionText from '../components/SMotionText.vue'
import SPageControl from '../components/SPageControl.vue'
import SPagination from '../components/SPagination.vue'
import SSelect from '../components/SSelect.vue'
import type { TablePaginationAlign, TablePaginationVariant } from './table-state'

const props = defineProps<{
  page: number
  pages?: number
  pageSize: number
  position: 'above' | 'below'
  align: TablePaginationAlign
  variant: TablePaginationVariant
  label: string
  pageSummary: string
  pageSizeLabel: string
  sizes: readonly { value: string; label: string }[]
  previousLabel: string
  nextLabel: string
  previous: boolean
  next: boolean
  disabled: boolean
  announce?: boolean
  locale?: string
  go: (page?: number) => void
  resize: (size?: string) => void
}>()
</script>

<template>
  <slot :page="props.page" :pages="pages" :page-size="pageSize" :position="position" :label="label" :go="go" :resize="resize">
    <div class="sy-table__paging" :data-align="align" :data-position="position">
      <SPagination v-if="variant === 'pages' && pages" :model-value="page" :total="pages" :locale="locale" :label="label"
        :previous-label="previousLabel" :next-label="nextLabel" :inert="disabled" @update:model-value="go" />
      <nav v-else-if="variant === 'dots' && pages" :aria-label="label">
        <SPageControl :model-value="page" :total-pages="pages" :label="label" :inert="disabled" @update:model-value="go" direct-jump />
      </nav>
      <nav v-else class="sy-table__pages" :aria-label="label">
        <SButton size="sm" variant="secondary" :aria-disabled="!previous || disabled || undefined" @click="go(page - 1)">{{ previousLabel }}</SButton>
        <SMotionText :value="pageSummary" motion="roll" :announce="announce" />
        <SButton size="sm" variant="secondary" :aria-disabled="!next || disabled || undefined" @click="go(page + 1)">{{ nextLabel }}</SButton>
      </nav>
      <SSelect v-if="sizes.length" :model-value="String(pageSize)" :label="pageSizeLabel" :options="sizes" :disabled="disabled"
        class="sy-table__page-size" @update:model-value="resize" />
    </div>
  </slot>
</template>
