import selectors from 'postcss-selector-parser'

const scope = ':where([data-sy-reduced-motion], [data-sy-reduced-motion] *)'
const inside = selectors().astSync(scope).first.first
const outside = selectors().astSync(`:not(${scope})`).first.first
const motion = /^\(\s*prefers-reduced-motion\s*:\s*(reduce|no-preference)\s*\)$/i

function scopeRules(media, filter) {
  media.walkRules(rule => {
    for (let parent = rule.parent; parent && parent !== media; parent = parent.parent) {
      if (parent.type === 'atrule' && parent.name.endsWith('keyframes')) return
    }
    rule.selector = selectors(list => list.each(selector => {
      const pseudo = selector.nodes.find(node => node.type === 'pseudo' && (node.value.startsWith('::')
        || [':before', ':after', ':first-letter', ':first-line'].includes(node.value)))
      if (pseudo) selector.insertBefore(pseudo, filter.clone())
      else selector.append(filter.clone())
    })).processSync(rule.selector)
  })
}

/** Apply the same CSS motion policy to theme scopes and to the OS setting. */
export function reducedMotionCss() {
  return {
    postcssPlugin: 'syntrofic-reduced-motion',
    Once(root) {
      root.walkAtRules('media', rule => {
        if (rule.source?.input.file?.includes('/node_modules/')) return
        const conditions = rule.params.split(/\s+and\s+/i)
        const index = conditions.findIndex(condition => motion.test(condition.trim()))
        if (index < 0) return
        if (motion.exec(conditions[index].trim())[1].toLowerCase() === 'no-preference') {
          scopeRules(rule, outside)
          return
        }
        const forced = rule.clone()
        scopeRules(forced, inside)
        const remaining = conditions.filter((_, position) => position !== index)
        if (remaining.length) rule.after(forced.assign({ params: remaining.join(' and ') }))
        else rule.after(forced.nodes)
      })
    },
  }
}
