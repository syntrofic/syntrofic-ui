import { themeConditions } from './theme-editor.mjs'
import { measureThemeAppearances } from './theme-part-report.mjs'
import { measuredStyleDifferences, measuredStyleProperties, stableEntries, styleSampleKey, writeMeasuredStyleRules } from './theme-measured-style.mjs'

const copyError = (code, message) => Object.assign(new Error(message), { code })

function copyScopes(library, reference, options, theme) {
  const { on: part, when, mode, state, only } = options
  if (mode || state || only) throw new Error('Copy a whole variant across its states and appearances. Use a property with --mode or --state for a scoped edit.')
  const target = part && Object.hasOwn(library.brandRuleTargets, part) && library.brandRuleTargets[part]
  if (!target?.variants) throw new Error('Choose a component with variants using --on')
  const parsed = /^(?:(variant|tone|size|elevation|orientation|level|mode|type|direction|parity):)?([a-z0-9-]+)$/.exec(reference)
  if (!parsed) throw new Error('Choose a reference, for example variant:primary or variant:default')
  const to = themeConditions(when)
  const axis = parsed[1] ?? ['variant', 'tone', ...Object.keys(target.variants)].find(axis => to[axis])
  const variants = target.variants[axis]?.values
  if (!variants || !variants.includes(to[axis])) throw new Error('Choose the destination with --when, for example variant:ghost')
  const source = variants.includes(parsed[2]) ? parsed[2] : parsed[2] === 'default' ? variants[0] : undefined
  if (!source) throw new Error(`Unknown ${axis} ${parsed[2]} on ${part}. Choose ${variants.join(', ')}`)
  if (source === to[axis]) throw copyError('ERR_THEME_NO_EFFECT', 'The reference and destination are the same variant.')
  const from = { ...to, [axis]: source }
  for (const condition of [from, to]) library.normalizeBrandRule({ target: part, when: condition, declarations: {} })
  const modes = theme.design?.appearance === 'light-only' ? ['light'] : theme.design?.appearance === 'dark-only' ? ['dark'] : ['light', 'dark']
  const properties = measuredStyleProperties(target)
  if (!properties.length) throw new Error(`No editable appearance properties on ${part}`)
  return { part, axis, from, to, modes, properties }
}

export async function planThemeVariantCopy(library, directory, theme, reference, options, effective) {
  const prior = await effective(theme)
  const spec = copyScopes(library, reference, options, prior)
  const { part, from, to, modes, properties } = spec
  const [source, before] = await measureThemeAppearances(directory, library, prior, part, [from, to], modes, properties)
  const translated = source.map(sample => ({ ...sample, when: { ...sample.when, [spec.axis]: to[spec.axis] } }))
  const indexed = new Map(translated.map(sample => [styleSampleKey(sample), sample]))
  if (indexed.size !== source.length) throw new Error('The reference has duplicate rendered samples')
  let pending = measuredStyleDifferences(indexed, before, properties)
  if (!pending.length) throw copyError('ERR_THEME_NO_EFFECT', 'The destination already matches the reference in the measured states and appearances.')
  const copiedProperties = [...new Set(pending.map(({ property }) => property))]
  const edits = new Map()
  let result
  for (let pass = 0; pass < 3; pass++) {
    const written = writeMeasuredStyleRules(library, theme, spec, indexed, pending, edits, pass > 0)
    if (!written && pass > 0) break
    if (!edits.size) continue
    result = library.applyBrandPatch(theme, { revision: theme.revision, changes: [...edits.values()] })
    const proposed = await effective(result)
    const [after] = await measureThemeAppearances(directory, library, proposed, part, [to], modes, properties)
    if (after.length !== before.length) throw new Error('The copy changed the specimen count')
    pending = measuredStyleDifferences(indexed, after, properties)
    if (!pending.length) {
      return { result, edits: [...edits.values()], match: {
        part, from, to, modes, states: [...new Set(before.map(sample => sample.state))], samples: before.length,
        properties, changed: copiedProperties, viewport: { width: 1200, height: 960 },
      } }
    }
  }
  const { sample, property } = pending[0]
  throw copyError('ERR_THEME_COPY_DIFF', `A rule still overrides ${property} in ${sample.mode}/${sample.state} (${stableEntries(sample.when)
    .map(pair => pair.join(':')).join('+')}). Review the component's existing scoped styles before copying.`)
}
