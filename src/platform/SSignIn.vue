<script lang="ts">
export interface SignInProvider { id: string; label: string }
export type SignInRequest =
  | { method: 'password'; email: string; password: string }
  | { method: 'provider'; provider: SignInProvider; email?: string }
export type SignInLayout = 'plain' | 'card' | 'split' | 'sso'
export interface SignInResult { redirect?: string }
</script>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, useId, useTemplateRef } from 'vue'
import SButton from '../components/SButton.vue'
import SForm from '../components/SForm.vue'
import SInput from '../components/SInput.vue'
import SLink from '../components/SLink.vue'
import { contentUrl } from '../internal/content-url'

const props = withDefaults(defineProps<{
  title: string
  description?: string
  layout?: SignInLayout
  providers?: readonly SignInProvider[]
  authenticate: (request: SignInRequest, signal: AbortSignal) => void | SignInResult | Promise<void | SignInResult>
  resolveProvider?: (email: string, signal: AbortSignal) => SignInProvider | null | Promise<SignInProvider | null>
  signupHref?: string
  recoveryHref?: string
  termsHref?: string
  privacyHref?: string
  labels?: Partial<Record<'email' | 'password' | 'submit' | 'next' | 'back' | 'recovery' | 'signup' | 'terms' | 'privacy' | 'providers' | 'error', string>>
}>(), { layout: 'plain', providers: () => [] })

const emit = defineEmits<{ success: [method: SignInRequest['method']]; failure: [] }>()
const email = ref<string>()
const password = ref<string>()
const provider = ref<SignInProvider>()
const step = ref<'email' | 'password' | 'provider'>('email')
const busy = ref<string>()
const failed = ref(false)
const identity = useId()
const heading = useTemplateRef<HTMLHeadingElement>('heading')
const address = useTemplateRef<InstanceType<typeof SInput>>('address')
let request: AbortController | undefined
const i18n = computed(() => ({
  email: 'Email address', password: 'Password', submit: 'Sign in', next: 'Continue',
  back: 'Use another address', recovery: 'Forgot password?', signup: 'Create an account',
  terms: 'Terms', privacy: 'Privacy', providers: 'Or continue with', error: 'Unable to sign in. Try again.',
  ...props.labels,
}))

async function attempt<T>(key: string, run: (signal: AbortSignal) => T | Promise<T>) {
  if (busy.value) return
  const operation = new AbortController()
  request = operation
  busy.value = key
  failed.value = false
  try {
    const value = await run(operation.signal)
    if (!operation.signal.aborted) return { value }
  } catch {
    if (!operation.signal.aborted) {
      failed.value = true
      emit('failure')
    }
  } finally {
    if (request === operation) {
      request = undefined
      busy.value = undefined
    }
  }
}

async function signIn(value: SignInRequest) {
  const key = value.method === 'password' ? 'submit' : value.provider.id
  const result = await attempt(key, async signal => {
    const signedIn = await props.authenticate(value, signal)
    const requested = signedIn?.redirect
    if (requested === undefined) return
    const destination = contentUrl(requested, true)
    if (!destination) throw new Error('Invalid sign-in destination')
    return destination
  })
  if (result) {
    password.value = undefined
    emit('success', value.method)
    if (result.value) heading.value?.ownerDocument.defaultView?.location.assign(result.value)
  }
}

async function next() {
  const value = email.value?.trim()
  if (!value) return
  if (props.layout === 'sso' && step.value === 'email') {
    const result = await attempt('submit', signal => props.resolveProvider?.(value, signal) ?? null)
    if (!result) return
    provider.value = result.value ?? undefined
    step.value = provider.value ? 'provider' : 'password'
    await nextTick()
    heading.value?.focus()
    return
  }
  if (provider.value) void signIn({ method: 'provider', provider: provider.value, email: value })
  else if (password.value) void signIn({ method: 'password', email: value, password: password.value })
}

async function back() {
  step.value = 'email'
  provider.value = undefined
  password.value = undefined
  failed.value = false
  await nextTick()
  address.value?.focus()
}

onBeforeUnmount(() => request?.abort())
</script>

<template>
  <section class="sy-sign-in" :data-layout="layout" :aria-labelledby="identity">
    <div class="sy-sign-in__body">
      <header>
        <slot name="brand" />
        <h2 :id="identity" ref="heading" tabindex="-1">{{ title }}</h2>
        <p v-if="description">{{ description }}</p>
      </header>
      <SForm class="sy-sign-in__form" :data-step="layout === 'sso' ? step : undefined" :aria-busy="Boolean(busy)" @submit="next">
        <SInput v-if="layout !== 'sso' || step === 'email'" ref="address" v-model="email" type="email"
          name="username" autocomplete="username" :label="i18n.email" :readonly="Boolean(busy)" required />
        <div v-else class="sy-sign-in__identity">
          <span>{{ email }}</span>
          <SButton size="sm" variant="ghost" :disabled="Boolean(busy)" @click="back">{{ i18n.back }}</SButton>
        </div>
        <template v-if="layout !== 'sso' || step === 'password'">
          <SInput v-model="password" type="password" name="password" autocomplete="current-password"
            :label="i18n.password" :readonly="Boolean(busy)" required />
          <SLink v-if="recoveryHref" :href="recoveryHref">{{ i18n.recovery }}</SLink>
        </template>
        <p v-if="failed" class="sy-sign-in__error" role="alert">{{ i18n.error }}</p>
        <SButton type="submit" :loading="busy === 'submit' || Boolean(provider && busy === provider.id)"
          :disabled="Boolean(busy && busy !== 'submit' && busy !== provider?.id)">
          {{ provider ? provider.label : layout === 'sso' && step === 'email' ? i18n.next : i18n.submit }}
        </SButton>
      </SForm>
      <div v-if="providers.length && (layout !== 'sso' || step === 'email')" class="sy-sign-in__providers">
        <p>{{ i18n.providers }}</p>
        <SButton v-for="option in providers" :key="option.id" variant="secondary" :loading="busy === option.id"
          :disabled="Boolean(busy && busy !== option.id)" @click="signIn({ method: 'provider', provider: option })">
          {{ option.label }}
        </SButton>
      </div>
      <footer v-if="signupHref || termsHref || privacyHref || $slots.footer">
        <SLink v-if="signupHref" :href="signupHref">{{ i18n.signup }}</SLink>
        <SLink v-if="termsHref" :href="termsHref">{{ i18n.terms }}</SLink>
        <SLink v-if="privacyHref" :href="privacyHref">{{ i18n.privacy }}</SLink>
        <slot name="footer" />
      </footer>
    </div>
    <div v-if="layout === 'split' && $slots.media" class="sy-sign-in__media"><slot name="media" /></div>
  </section>
</template>
