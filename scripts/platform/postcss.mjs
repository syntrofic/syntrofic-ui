import { resolve } from 'node:path'
import { loadProjectThemes } from './vite.mjs'

const name = 'syntrofic-theme-postcss'

export function syntroficThemePostcss({ cwd = process.cwd(), ...options } = {}) {
  return {
    postcssPlugin: name,
    async Once(root, { result }) {
      const rules = []
      root.walkAtRules('syntrofic-theme', rule => {
        if (rule.params || rule.nodes) throw rule.error('Use @syntrofic-theme without parameters or a block', { plugin: name })
        rules.push(rule)
      })
      if (!rules.length) return
      const watched = new Set()
      const { css } = await loadProjectThemes(resolve(cwd), options, file => watched.add(file))
      for (const file of watched) result.messages.push({ type: 'dependency', plugin: name, file, parent: result.opts.from })
      const styles = css()
      for (const rule of rules) {
        if (styles) rule.replaceWith(styles)
        else rule.remove()
      }
    },
  }
}
syntroficThemePostcss.postcss = true
export default syntroficThemePostcss
