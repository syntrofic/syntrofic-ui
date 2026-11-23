import type { InjectionKey } from 'vue'

export type IconWeight = 300 | 400 | 500 | 600 | 700
export interface WeightedIconPath { d: string; fill?: string; stroke?: string; strokeWidth?: number }
export interface WeightedIconDefinition {
  id: string
  viewBox: string
  drawings: Readonly<Partial<Record<IconWeight, readonly WeightedIconPath[]>>>
}
const weights: readonly IconWeight[] = [300, 400, 500, 600, 700]
export const weightedIconSpriteContext: InjectionKey<(id: string, weight: IconWeight) => string | undefined> = Symbol('Syntrofic icon sprite')

export function buildWeightedIcon(id: string, drawings: Partial<Record<IconWeight, string | readonly WeightedIconPath[]>>, options: { viewBox?: string; weights?: readonly IconWeight[] } = {}): WeightedIconDefinition {
  if (!/^[a-z][a-z0-9-]*$/i.test(id)) throw new Error('Expected an icon identifier')
  const selected = weights.filter(weight => !options.weights || options.weights.includes(weight)).flatMap(weight => {
    const drawing = drawings[weight]
    return !drawing?.length ? [] : [[weight, typeof drawing === 'string' ? [{ d: drawing }] : drawing.map(path => ({ ...path }))]]
  })
  if (!selected.length) throw new Error('At least one icon drawing is required')
  return { id, viewBox: options.viewBox ?? '0 0 24 24', drawings: Object.fromEntries(selected) }
}

export function nearestIconWeight(definition: WeightedIconDefinition, requested: number) {
  return weights.filter(weight => definition.drawings[weight]?.length).reduce<IconWeight | undefined>((nearest, weight) => (
    nearest === undefined || Math.abs(requested - weight) < Math.abs(requested - nearest) ? weight : nearest
  ), undefined) ?? 400
}
