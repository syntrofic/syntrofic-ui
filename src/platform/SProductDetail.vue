<script lang="ts">
import type { GalleryAsset } from './SAssetGallery.vue'

export interface ProductVariant {
  id: string
  label: string
  price: number
  stock?: number
  swatch?: string
  image?: string
}
export interface ProductSpecification { id: string; title: string; description: string }
</script>

<script setup lang="ts">
import { computed, ref, useId, watch } from 'vue'
import SBadge from '../components/SBadge.vue'
import SButton from '../components/SButton.vue'
import SDisclosure from '../components/SDisclosure.vue'
import SImage from '../components/SImage.vue'
import SLightbox from '../components/SLightbox.vue'
import SMotionText from '../components/SMotionText.vue'
import SNumberStepper from '../components/SNumberStepper.vue'
import SRadio from '../components/SRadio.vue'
import SRadioGroup from '../components/SRadioGroup.vue'

const props = withDefaults(defineProps<{
  title: string
  description?: string
  assets: readonly GalleryAsset[]
  variants: readonly ProductVariant[]
  specifications?: readonly ProductSpecification[]
  currency: string
  locale?: string
  rating?: number
  ratingCount?: number
  labels?: Partial<Record<'variants' | 'quantity' | 'view' | 'previous' | 'next' | 'close' | 'add' | 'save' | 'saved' | 'unavailable' | 'rating' | 'specifications', string>>
}>(), { specifications: () => [] })

const picked = defineModel<string>('variant')
const saved = defineModel<boolean>('saved', { default: false })
const emit = defineEmits<{ add: [selection: { variant: ProductVariant; quantity: number }] }>()
const quantity = ref<number>(1)
const mediaIndex = ref(0)
const open = ref(false)
const id = useId()
const active = computed(() => props.variants.find(item => item.id === picked.value) ?? props.variants[0])
const stock = computed(() => {
  const requested = active.value?.stock
  return typeof requested === 'number' && Number.isFinite(requested) ? Math.max(0, Math.trunc(requested)) : undefined
})
const photo = computed(() => props.assets[mediaIndex.value] ?? props.assets[0])
const preview = computed(() => {
  const asset = photo.value
  return asset && (asset.thumbnail ?? (asset.type === 'video' ? asset.poster : asset.src))
})
const formatter = computed(() => new Intl.NumberFormat(props.locale, { style: 'currency', currency: props.currency }))
const text = computed(() => ({
  variants: 'Variants', quantity: 'Quantity', view: 'View media', previous: 'Previous', next: 'Next', close: 'Close',
  add: 'Add to order', save: 'Save', saved: 'Saved', unavailable: 'Out of stock', rating: 'Rating', specifications: 'Specifications',
  ...props.labels,
}))
const total = computed(() => formatter.value.format((active.value?.price ?? 0) * (quantity.value ?? 1)))
watch(stock, value => { if (value && (quantity.value ?? 1) > value) quantity.value = value })
watch(active, variant => {
  if (!variant?.image) return
  const index = props.assets.findIndex(item => item.id === variant.image)
  if (index !== -1) mediaIndex.value = index
}, { immediate: true })

function add() {
  if (!active.value || !quantity.value || quantity.value < 1 || stock.value === 0 || (stock.value !== undefined && quantity.value > stock.value)) return
  emit('add', { variant: active.value, quantity: quantity.value })
}
</script>

<template>
  <section class="sy-offering" :aria-labelledby="id">
    <div class="sy-offering__columns">
      <div v-if="photo" class="sy-offering__gallery">
        <div class="sy-offering__image-frame">
          <SImage v-if="preview" :src="preview" :alt="photo.alt" :ratio="4 / 3" placeholder />
          <button type="button" class="sy-offering__image" :aria-label="text.view + ' · ' + photo.title" @click="open = true" />
        </div>
        <div v-if="assets.length > 1" class="sy-offering__options">
          <SButton v-for="(asset, index) in assets" :key="asset.id" size="sm" :variant="index === mediaIndex ? 'primary' : 'secondary'"
            :aria-pressed="index === mediaIndex" @click="mediaIndex = index">{{ asset.title }}</SButton>
        </div>
        <SLightbox v-model:open="open" v-model:index="mediaIndex" :media="assets" :label="title"
          :close-label="text.close" :previous-label="text.previous" :next-label="text.next" />
      </div>
      <div class="sy-offering__rail">
        <header>
          <h2 :id="id">{{ title }}</h2>
          <p v-if="description">{{ description }}</p>
          <SBadge v-if="rating !== undefined" tone="warning">{{ text.rating }} {{ rating }} / 5<span v-if="ratingCount !== undefined"> · {{ ratingCount }}</span></SBadge>
        </header>
        <SRadioGroup v-if="variants.length" :model-value="active?.id" :label="text.variants" @update:model-value="picked = $event">
          <SRadio v-for="variant in variants" :key="variant.id" :value="variant.id">
            <span v-if="variant.swatch" class="sy-offering__swatch" :style="{ backgroundColor: variant.swatch }" aria-hidden="true" />
            {{ variant.label }}
          </SRadio>
        </SRadioGroup>
        <SNumberStepper v-if="stock !== 0 && active" v-model="quantity" :min="1" :max="stock" :starting-value="1" :label="text.quantity" />
        <p v-if="active" class="sy-offering__price"><SMotionText :value="total" motion="roll" /></p>
        <div class="sy-offering__options">
          <SButton :disabled="!active || stock === 0 || !quantity" @click="add">{{ stock === 0 ? text.unavailable : text.add }}</SButton>
          <SButton variant="secondary" :aria-pressed="saved" @click="saved = !saved">{{ saved ? text.saved : text.save }}</SButton>
        </div>
        <slot name="rail" :variant="active" :quantity="quantity" />
      </div>
    </div>
    <section v-if="specifications.length" class="sy-offering__sections" :aria-label="text.specifications">
      <h3>{{ text.specifications }}</h3>
      <SDisclosure v-for="item in specifications" :key="item.id" :title="item.title"><p>{{ item.description }}</p></SDisclosure>
    </section>
  </section>
</template>
