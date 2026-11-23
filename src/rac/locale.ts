import { computed, inject, type ComputedRef, type InjectionKey } from 'vue'

export type Direction = 'ltr' | 'rtl'
export interface LocaleContext {
  locale: ComputedRef<string>
  direction: ComputedRef<Direction>
  calendar?: ComputedRef<string | undefined>
  messages?: ComputedRef<Readonly<Record<string, unknown>> | undefined>
}

export interface LocalizationData {
  locale: string
  direction: Direction
  messages?: Readonly<Record<string, unknown>>
}

export type LocaleCatalog = Readonly<Record<string, string>>
export type LocaleCatalogs = Readonly<Record<string, LocaleCatalog | undefined>>

function canonicalLocale(locale: string) {
  try { return new Intl.Locale(locale).baseName }
  catch { return locale.trim() }
}

export function localeFallbacks(locale: string) {
  const parts = canonicalLocale(locale).split('-')
  return [...new Set(['en', ...parts.map((_, index) => parts.slice(0, index + 1).join('-'))])].filter(Boolean)
}

export function resolveLocaleCatalog(locale: string, catalogs?: LocaleCatalogs, overrides?: LocaleCatalogs) {
  const languageKeys = localeFallbacks(locale)
  const resolve = (records: LocaleCatalogs = {}) => {
    const byName = new Map(Object.entries(records).map(([name, messages]) => [canonicalLocale(name), messages]))
    return languageKeys.map(key => byName.get(key))
  }
  return Object.fromEntries([...resolve(catalogs), ...resolve(overrides)].flatMap(messages => Object.entries(messages ?? {})))
}

export function localeWithCalendar(locale: string, calendar?: string) {
  if (!calendar) return locale
  try { return new Intl.Locale(locale, { calendar }).toString() }
  catch { return locale }
}

export const localeContext: InjectionKey<LocaleContext> = Symbol('localized-interface')
const rtlScripts = new Set(['Adlm', 'Arab', 'Armi', 'Avst', 'Chrs', 'Elym', 'Hatr', 'Hebr', 'Hung', 'Khar', 'Lydi', 'Mand', 'Mani', 'Mend', 'Merc', 'Mero', 'Narb', 'Nbat', 'Nkoo', 'Orkh', 'Palm', 'Phli', 'Phlp', 'Phnx', 'Prti', 'Rohg', 'Samr', 'Sarb', 'Sogd', 'Sogo', 'Syrc', 'Thaa', 'Yezi'])

export function isRTL(language: string) {
  try {
    const locale = new Intl.Locale(language)
    const extended = locale as Intl.Locale & { getTextInfo?: () => { direction: Direction }; textInfo?: { direction: Direction } }
    const direction = extended.getTextInfo?.().direction ?? extended.textInfo?.direction
    return direction ? direction === 'rtl' : rtlScripts.has(locale.maximize().script ?? '')
  } catch {
    return false
  }
}

export function getLocaleDirection(locale: string): Direction {
  return isRTL(locale) ? 'rtl' : 'ltr'
}

export function useLocale(): LocaleContext {
  return inject(localeContext, null) ?? {
    locale: computed(() => readLocalization()?.locale ?? 'en'),
    direction: computed(() => readLocalization()?.direction ?? 'ltr'),
    messages: computed(() => readLocalization()?.messages),
  }
}

export function readLocalization(): LocalizationData | undefined {
  const value = (globalThis as typeof globalThis & { __SYNTROFIC_LOCALE__?: LocalizationData }).__SYNTROFIC_LOCALE__
  if (!value || typeof value.locale !== 'string' || (value.direction !== 'ltr' && value.direction !== 'rtl')) return undefined
  return value
}

export function getLocalizationScript(locale: string, messages?: Readonly<Record<string, unknown>>) {
  const direction = getLocaleDirection(locale)
  const payload = JSON.stringify({ locale, direction, messages })
    .replaceAll('<', '\\u003c')
    .replaceAll('\u2028', '\\u2028')
    .replaceAll('\u2029', '\\u2029')
  return 'globalThis.__SYNTROFIC_LOCALE__ = ' + payload + '\n'
}

export function useDirection() { return useLocale().direction }

export function useCollator(options?: Intl.CollatorOptions) {
  const { locale } = useLocale()
  return computed(() => new Intl.Collator(locale.value, options))
}

export function useTranslator(fallback: Readonly<Record<string, string>> = {}) {
  const { messages } = useLocale()
  return (key: string, values: Record<string, string | number> = {}) => {
    const text = messages?.value?.[key]
    const defaultText = Object.hasOwn(fallback, key) ? fallback[key] : key
    const template = typeof text === 'string' ? text : defaultText
    return template.replace(/\{([\w-]+)\}/g, (placeholder, name) =>
      Object.hasOwn(values, name) ? String(values[name]) : placeholder)
  }
}
