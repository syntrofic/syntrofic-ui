const appearanceProperties = [
  'background-color', 'background-image', 'color', 'border-style', 'border-width', 'border-color', 'border-radius', 'box-shadow',
  'min-height', 'padding', 'gap', 'font-family', 'font-size', 'font-weight', 'line-height', 'letter-spacing',
]
const modeProperties = new Set(['background-color', 'background-image', 'color', 'border-color', 'box-shadow', '--sy-field-hover-ring-color'])
export const stableEntries = value => Object.entries(value).sort(([a], [b]) => a.localeCompare(b))
export const boxShadowLayers = value => value.match(/(?:[^(),]+|\([^()]*\))+/g)?.map(layer => layer.trim()) ?? []

export function measuredStyleProperties(target) {
  const geometry = Object.hasOwn(target.properties, 'width') && Object.hasOwn(target.properties, 'height') ? ['width', 'height'] : []
  return [...appearanceProperties, ...geometry].filter(property => Object.hasOwn(target.properties, property))
}

export function styleSampleKey({ when, mode, state, placement, field }) {
  return JSON.stringify([stableEntries(when), mode, state, placement, field])
}

export function measuredStyleDifferences(reference, destination, properties) {
  const seen = new Set()
  const differences = destination.flatMap(sample => {
    const key = styleSampleKey(sample)
    const desired = reference.get(key)
    if (!desired || seen.has(key)) throw new Error('The measured samples do not match the reference states and sizes')
    seen.add(key)
    return properties.flatMap(property => desired.values[property] === sample.values[property] ? [] : [{ property, sample, value: desired.values[property] }])
  })
  if (seen.size !== reference.size) throw new Error('The measured samples do not match the reference states and sizes')
  return differences
}

function scopeKey({ when, state, mode, field }, property, exact) {
  return JSON.stringify([exact && [field, stableEntries(when)], state, modeProperties.has(property) && mode, property])
}

export function writeMeasuredStyleRules(library, theme, { part, to, properties }, reference, pending, edits, precise) {
  const values = new Map()
  for (const sample of reference.values()) {
    for (const property of properties) for (const exact of [false, true]) {
      const key = scopeKey(sample, property, exact)
      const group = values.get(key) ?? new Set()
      group.add(sample.values[property])
      values.set(key, group)
    }
  }
  let written = 0
  for (const { property, sample, value } of pending) {
    const exact = precise || values.get(scopeKey(sample, property, false)).size !== 1
    if (values.get(scopeKey(sample, property, exact)).size !== 1) {
      throw new Error(`Cannot reproduce ${property} with one declaration for ${sample.state} across the matching placements or appearances`)
    }
    if (!value) throw new Error(`No computed value for ${property} in ${sample.state}`)
    const scope = {
      target: exact && part === 'field' ? sample.field ?? part : part,
      when: exact ? sample.when : to, state: sample.state === 'rest' ? undefined : sample.state,
      ...(modeProperties.has(property) && { mode: sample.mode }),
    }
    const key = library.brandRuleKey(scope)
    const current = edits.get(key)?.value ?? theme.rules?.[key]
    const heightToken = property === 'min-height' && library.brandControlHeightParts[part]?.property
    const name = heightToken && /^\d+(?:\.\d+)?px$/.test(value) ? heightToken : property
    // Field CSS supplies the first, transparent ring at rest when it paints the authored shadow.
    const authoredShadow = property === 'box-shadow' && sample.state === 'rest' && library.brandFieldShadowParts.includes(scope.target)
    const declaration = authoredShadow ? boxShadowLayers(value).slice(1).join(', ') || 'none' : value
    if (current?.declarations[name] === declaration && (name === property || current.declarations[property] === undefined)) continue
    const declarations = { ...current?.declarations }
    // Place the measured longhand after shorthands at the same scope.
    delete declarations[property]
    delete declarations[name]
    declarations[name] = declaration
    const authored = theme.inheritedRules && { ...current?.authored, [name]: true }
    const rule = library.normalizeBrandRule({ ...scope, declarations, authored })
    edits.set(key, { type: 'rule', key, value: rule })
    written++
  }
  return written
}
