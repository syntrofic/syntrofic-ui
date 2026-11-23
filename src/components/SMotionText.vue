<script setup lang="ts">
import { computed, watch } from 'vue'
import { labelDirection } from '../internal/label-direction'

const props = withDefaults(defineProps<{
  value: string
  motion?: 'reveal' | 'roll'
  announce?: boolean
  appear?: boolean
  wrap?: boolean
  truncate?: boolean
  animate?: boolean
}>(), { motion: 'reveal', animate: true })

const segmenter = typeof Intl.Segmenter === 'function'
  ? new Intl.Segmenter(undefined, { granularity: 'grapheme' })
  : undefined
const versions: number[] = []
let previous: string[] = []
let sequence = 0
const digit = /^\p{Decimal_Number}$/u
const sign = /^[+\-\u2212]$/u
const joiningLetter = /^[\p{Script=Arabic}\p{Script=Syriac}\p{Script=Mandaic}]/u

function readCharacters(value: string) {
  const graphemes = segmenter
    ? Array.from(segmenter.segment(value), part => part.segment)
    : Array.from(value)
  const places: string[] = []
  let joins = false
  for (const grapheme of graphemes) {
    const nextJoins = joiningLetter.test(grapheme) && /\p{Letter}/u.test(grapheme)
    if (joins && nextJoins) places[places.length - 1] += grapheme
    else places.push(grapheme)
    joins = nextJoins
  }
  return places
}

const characters = computed(() => readCharacters(props.value))
const placeGroups = computed(() => {
  const groups: {
    index: number
    numeric: boolean
    places: { character: string; key: number; motion: 'roll' | 'reveal'; sign: boolean }[]
  }[] = []
  for (const [index, character] of characters.value.entries()) {
    const numeric = digit.test(character)
    // Keep a run of digits in reading order when the surrounding text is right-to-left.
    const adjacentDigits = /^[.,\u066b\u066c]$/u.test(character)
      && digit.test(characters.value[index - 1] ?? '') && digit.test(characters.value[index + 1] ?? '')
    const numberGroup = numeric || adjacentDigits
    if (groups.at(-1)?.numeric !== numberGroup) groups.push({ index, numeric: numberGroup, places: [] })
    groups.at(-1)?.places.push({
      character,
      key: versions[index] ?? 0,
      motion: props.motion === 'roll' && numeric ? 'roll' : 'reveal',
      sign: props.motion === 'roll' && sign.test(character)
        && digit.test(characters.value[index - 1] ?? '') !== digit.test(characters.value[index + 1] ?? ''),
    })
  }
  return groups
})

watch(characters, next => {
  for (const [index, character] of next.entries()) {
    if (character !== previous[index]) versions[index] = ++sequence
  }
  previous = next
}, { immediate: true, flush: 'sync' })
</script>

<template>
  <span class="sy-motion-text" :data-wrap="wrap && !truncate || undefined" :data-truncate="truncate || undefined">
    <span class="sy-visually-hidden" :aria-live="announce ? 'polite' : undefined">{{ value }}</span>
    <Transition v-if="truncate" name="sy-truncated-text" :appear="appear && animate" :css="animate">
      <span :key="value" class="sy-motion-text__truncated" :dir="labelDirection(value)" aria-hidden="true">{{ value }}</span>
    </Transition>
    <span v-else class="sy-motion-text__visual" aria-hidden="true">
      <span v-for="group in placeGroups" :key="group.index" class="sy-motion-text__group" :dir="group.numeric ? 'ltr' : undefined">
        <span
          v-for="({ character, key, motion: animation, sign: numberSign }, index) in group.places"
          :key="index"
          class="sy-motion-text__place"
          :data-motion="animation"
          :data-number-sign="numberSign || undefined"
        >
          <Transition name="sy-character" :appear="appear && animate" :css="animate">
            <span :key="key" class="sy-motion-text__glyph">{{ character }}</span>
          </Transition>
        </span>
      </span>
    </span>
  </span>
</template>
