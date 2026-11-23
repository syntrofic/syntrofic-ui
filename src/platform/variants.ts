import { twMerge } from 'tailwind-merge'
export type VariantClasses = string | Readonly<Record<string, string>>
type VariantMap = Readonly<Record<string, Readonly<Record<string, VariantClasses>>>>
type Choices<V extends VariantMap> = { [Key in keyof V]?: keyof V[Key] | (keyof V[Key] extends 'true' | 'false' ? boolean : never) }
type Responsive<V extends VariantMap> = Readonly<Record<string, Choices<V>>>
export interface VariantRecipe<V extends VariantMap> {
  base?: VariantClasses
  variants: V
  defaults?: Choices<V>
  compounds?: readonly { when: Choices<V>; classes: VariantClasses }[]
  merge?: (classes: string) => string
}
export interface VariantResult {
  className: string
  slot: (name: string) => string
}
export function createVariants<const V extends VariantMap>(recipe: VariantRecipe<V>) {
  function apply(selection: Choices<V> = {}, extras: { class?: VariantClasses; responsive?: Responsive<V> } = {}): VariantResult {
    const selected = { ...recipe.defaults, ...selection }
    const slots = new Map<string, string[]>()
    function collect(style?: VariantClasses, prefix = '') {
      if (!style) return
      for (const [slot, value] of Object.entries(typeof style === 'string' ? { root: style } : style)) {
        const instances = slots.get(slot) ?? []
        instances.push(...value.trim().split(/\s+/).filter(Boolean).map(name => prefix ? prefix + ':' + name : name))
        slots.set(slot, instances)
      }
    }
    function select(values: Choices<V>, prefix = '') {
      for (const [key, value] of Object.entries(values)) {
        if (value !== undefined && Object.hasOwn(recipe.variants, key) && Object.hasOwn(recipe.variants[key], String(value)))
          collect(recipe.variants[key][String(value)], prefix)
      }
      for (const rule of recipe.compounds ?? []) {
        if (Object.entries(rule.when).every(([key, value]) => String(values[key]) === String(value))) collect(rule.classes, prefix)
      }
    }
    collect(recipe.base)
    select(selected)
    for (const [prefix, values] of Object.entries(extras.responsive ?? {})) select(values, prefix)
    collect(extras.class)
    const clean = recipe.merge ?? twMerge
    const slot = (name: string) => clean(slots.get(name)?.join(' ') ?? '')
    return { className: slot('root'), slot }
  }
  function extend<const E extends VariantMap>(other: VariantRecipe<E>) {
    const variants = { ...recipe.variants } as VariantMap
    const combined = Object.fromEntries([...new Set([...Object.keys(variants), ...Object.keys(other.variants)])].map(key => [
      key, { ...variants[key], ...other.variants[key] },
    ])) as V & E
    return createVariants<V & E>({
      variants: combined,
      base: mergeVariants(recipe.base, other.base),
      defaults: { ...recipe.defaults, ...other.defaults } as Choices<V & E>,
      compounds: [...(recipe.compounds ?? []), ...(other.compounds ?? [])] as VariantRecipe<V & E>['compounds'],
      merge: other.merge ?? recipe.merge,
    })
  }
  return Object.assign(apply, { extend })
}
function mergeVariants(first?: VariantClasses, second?: VariantClasses) {
  const normalize = (value?: VariantClasses) => typeof value === 'string' ? { root: value } : value ?? {}
  const a = normalize(first)
  const b = normalize(second)
  return Object.fromEntries([...new Set([...Object.keys(a), ...Object.keys(b)])].map(key => [key, [a[key], b[key]].filter(Boolean).join(' ')]))
}
