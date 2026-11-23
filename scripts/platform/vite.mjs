import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { editorSource, validatedTheme } from './theme.mjs'
import { readThemeDescriptor } from './theme-descriptor.mjs'
import { compileIcons } from './icon.mjs'
import { resolveThemeFonts } from './theme-fonts.mjs'

const moduleId = 'virtual:syntrofic-theme'
const stylesId = moduleId + '.css'
const iconsId = 'virtual:syntrofic-icons'
const resolvedIds = new Set(['\0' + moduleId, '\0' + stylesId, '\0' + iconsId])

export async function loadProjectThemes(projectRoot, { manifests = [], registry = 'syntrofic.themes.json' }, observe) {
  const library = await import('@syntrofic/ui')
  const state = { active: null, themes: [], editable: [] }
  if (registry) {
    const file = resolve(projectRoot, registry)
    observe?.(file)
    try {
      const content = JSON.parse(await readFile(file, 'utf8'))
      if (content.version !== 1 || !Array.isArray(content.themes)) throw new Error('Invalid Syntrofic theme registry')
      state.active = typeof content.active === 'string' ? content.active : null
      state.themes = content.themes
      state.editable = Array.isArray(content.editable) ? content.editable : []
    } catch (error) {
      if (error.code !== 'ENOENT') throw error
    }
  }
  const explicit = await Promise.all(manifests.map(manifest => readThemeDescriptor(resolve(projectRoot, manifest), { observe })))
  const registered = await Promise.all(state.themes.map(async value => {
    const theme = validatedTheme(value, library)
    return state.editable.includes(theme.id) ? (await editorSource(projectRoot, theme, library, observe)).theme : theme
  }))
  const themes = Object.fromEntries([...registered, ...explicit.map(theme => validatedTheme(theme, library))].map(theme => [theme.id, theme]))
  const active = state.active && Object.hasOwn(themes, state.active) ? state.active : Object.keys(themes)[0] ?? null
  const fonts = await resolveThemeFonts(projectRoot, Object.values(themes), observe)
  return { themes, active, css: () => [fonts.css, ...Object.values(themes).map(theme => library.exportBrandTheme(theme)['theme.css'])]
    .filter(Boolean).join('\n') }
}

export function syntroficThemePlugin(options = {}) {
  let projectRoot
  const inputs = new Set()
  return {
    name: 'syntrofic-theme-manifests',
    configResolved(config) { projectRoot = config.root },
    resolveId(id) { return resolvedIds.has('\0' + id) ? '\0' + id : undefined },
    async load(id) {
      if (!resolvedIds.has(id)) return
      const observe = file => { inputs.add(file); this.addWatchFile(file) }
      if (id === '\0' + iconsId) {
        const file = resolve(projectRoot, 'syntrofic.icons.json')
        observe(file)
        return compileIcons(projectRoot, specifier => specifier.startsWith('./') ? '/' + specifier.slice(2) : specifier, observe)
      }
      const { themes, active, css } = await loadProjectThemes(projectRoot, options, observe)
      if (id === '\0' + stylesId) return css()
      return 'import ' + JSON.stringify(stylesId) + '\nexport const themes = ' + JSON.stringify(themes) + '\n'
        + 'export const activeTheme = ' + JSON.stringify(active) + '\n'
        + 'export const defaultTheme = activeTheme ? themes[activeTheme] : undefined\nexport default defaultTheme\n'
    },
    handleHotUpdate({ file, server }) {
      if (inputs.has(file)) {
        return [...resolvedIds].map(id => server.moduleGraph.getModuleById(id)).filter(Boolean)
      }
    },
  }
}
