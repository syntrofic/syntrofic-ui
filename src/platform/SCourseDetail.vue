<script lang="ts">
export interface CourseModule { id: string; title: string; description?: string; lessons: readonly string[] }
export interface CourseSession { id: string; label: string; start: string }
export interface CourseReview { id: string; name: string; rating: number; text: string }
export interface CourseFact { id: string; label: string; value: string | number }
export interface CourseDetail {
  title: string
  summary: string
  description?: string
  hours: number
  price: number
  currency: string
  instructor: { name: string; description?: string; image?: string }
  facts?: readonly CourseFact[]
  skills?: readonly string[]
  modules: readonly CourseModule[]
  sessions: readonly CourseSession[]
  reviews?: readonly CourseReview[]
  aspects?: readonly { id: string; label: string; rating: number }[]
  questions?: readonly { id: string; question: string; answer: string }[]
}
</script>

<script setup lang="ts">
import { computed, onScopeDispose, ref, useId, useTemplateRef, watch } from 'vue'
import SAvatar from '../components/SAvatar.vue'
import SBadge from '../components/SBadge.vue'
import SButton from '../components/SButton.vue'
import SDisclosure from '../components/SDisclosure.vue'
import SProgressBar from '../components/SProgressBar.vue'
import SRadio from '../components/SRadio.vue'
import SRadioGroup from '../components/SRadioGroup.vue'
import SSlider from '../components/SSlider.vue'
import { createAnimator } from '../internal/motion'

const props = withDefaults(defineProps<{
  course: CourseDetail
  locale?: string
  labels?: Partial<Record<'about' | 'syllabus' | 'instructor' | 'reviews' | 'faq' | 'session' | 'pace' | 'hours' | 'finish' | 'enroll' | 'duration' | 'modules' | 'facts', string>>
}>(), {})

const selected = defineModel<string>('session')
const emit = defineEmits<{ enroll: [selection: { session: CourseSession; weeklyHours: number; estimatedFinish: Date }] }>()
const pace = ref(5)
const id = useId()
const session = computed(() => props.course.sessions.find(item => item.id === selected.value) ?? props.course.sessions[0])
const planned = computed(() => {
  const start = session.value ? Date.parse(session.value.start) : NaN
  if (!Number.isFinite(start) || !Number.isFinite(props.course.hours)) return
  const end = new Date(start + 86400000 * Math.ceil(Math.max(0, props.course.hours) / pace.value * 7))
  if (Number.isFinite(+end)) return end
})
const date = computed(() => new Intl.DateTimeFormat(props.locale, { dateStyle: 'medium', timeZone: 'UTC' }))
const price = computed(() => new Intl.NumberFormat(props.locale, { style: 'currency', currency: props.course.currency }).format(props.course.price))
const text = computed(() => ({
  about: 'About', syllabus: 'Syllabus', instructor: 'Instructor', reviews: 'Reviews', faq: 'Frequently asked questions',
  session: 'Start date', pace: 'Weekly study time', hours: 'hours', finish: 'Estimated finish', enroll: 'Enroll',
  duration: 'Duration', modules: 'Modules', facts: 'Course information',
  ...props.labels,
}))
const facts = computed(() => props.course.facts ?? [
  { id: 'duration', label: text.value.duration, value: `${props.course.hours} ${text.value.hours}` },
  { id: 'modules', label: text.value.modules, value: new Intl.NumberFormat(props.locale).format(props.course.modules.length) },
])
const finish = computed(() => planned.value ? `${text.value.finish} · ${date.value.format(planned.value)}` : '')
const estimate = useTemplateRef<HTMLElement>('estimate')
let animator: ReturnType<typeof createAnimator> | undefined
watch(finish, value => {
  if (value && estimate.value) {
    animator ??= createAnimator(estimate.value)
    animator.animate('finish', [{ opacity: .5 }, { opacity: 1 }], { role: 'move' })
  }
}, { flush: 'post' })
onScopeDispose(() => animator?.dispose())
function enroll() {
  if (session.value && planned.value) emit('enroll', { session: session.value, weeklyHours: pace.value, estimatedFinish: planned.value })
}
</script>

<template>
  <section class="sy-offering" :aria-labelledby="id">
    <header class="sy-offering__heading"><h2 :id="id">{{ course.title }}</h2><p>{{ course.summary }}</p></header>
    <div class="sy-offering__columns">
      <div class="sy-offering__sections">
        <div v-if="$slots.media" class="sy-offering__poster"><slot name="media" /></div>
        <dl v-if="facts.length" class="sy-offering__facts" :aria-label="text.facts">
          <div v-for="fact in facts" :key="fact.id"><dt>{{ fact.label }}</dt><dd>{{ fact.value }}</dd></div>
        </dl>
        <section class="sy-offering__panel">
          <h3>{{ text.about }}</h3>
          <p v-if="course.description">{{ course.description }}</p>
          <div v-if="course.skills?.length" class="sy-offering__options">
            <SBadge v-for="skill in course.skills" :key="skill" tone="accent">{{ skill }}</SBadge>
          </div>
        </section>
        <section class="sy-offering__panel">
          <h3>{{ text.syllabus }}</h3>
          <SDisclosure v-for="module in course.modules" :key="module.id" :title="module.title">
            <p v-if="module.description">{{ module.description }}</p>
            <ol><li v-for="lesson in module.lessons" :key="lesson">{{ lesson }}</li></ol>
          </SDisclosure>
        </section>
        <section class="sy-offering__panel">
          <h3>{{ text.instructor }}</h3>
          <div class="sy-offering__person"><SAvatar :src="course.instructor.image" :name="course.instructor.name" :tooltip="false" /><strong>{{ course.instructor.name }}</strong></div>
          <p v-if="course.instructor.description">{{ course.instructor.description }}</p>
        </section>
        <section v-if="course.reviews?.length || course.aspects?.length" class="sy-offering__panel">
          <h3>{{ text.reviews }}</h3>
          <SProgressBar v-for="aspect in course.aspects" :key="aspect.id" :label="aspect.label" :value="aspect.rating" :max="5"
            :format-options="{ maximumFractionDigits: 1 }" />
          <blockquote v-for="review in course.reviews" :key="review.id" class="sy-offering__review">
            <strong>{{ review.name }} · {{ review.rating }} / 5</strong><p>{{ review.text }}</p>
          </blockquote>
        </section>
        <section v-if="course.questions?.length" class="sy-offering__panel">
          <h3>{{ text.faq }}</h3>
          <SDisclosure v-for="question in course.questions" :key="question.id" :title="question.question"><p>{{ question.answer }}</p></SDisclosure>
        </section>
      </div>
      <aside class="sy-offering__rail" :aria-label="text.enroll">
        <strong class="sy-offering__price">{{ price }}</strong>
        <SRadioGroup :model-value="session?.id" :label="text.session" @update:model-value="selected = $event">
          <SRadio v-for="item in course.sessions" :key="item.id" :value="item.id">{{ item.label }}</SRadio>
        </SRadioGroup>
        <SSlider v-model="pace" :min="1" :max="20" :step="1" :label="text.pace" />
        <p v-show="finish" ref="estimate" aria-live="polite">{{ finish }}</p>
        <SButton :disabled="!planned" @click="enroll">{{ text.enroll }}</SButton>
      </aside>
    </div>
  </section>
</template>
