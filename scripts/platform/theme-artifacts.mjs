import { lstat, realpath } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { basename, dirname, isAbsolute, relative, resolve, sep } from 'node:path'
import { readThemeOutput, writeThemeOutputs } from './theme-write.mjs'
import { themeEditorPalette } from './theme-editor-palette.mjs'
import { resolveThemeFonts } from './theme-fonts.mjs'

const marker = 'Syntrofic theme build'
const paletteName = 'palette.json'
const stemPattern = /^[a-z0-9][a-z0-9-]{0,63}$/
const text = value => JSON.stringify(value, null, 2)
const digest = value => createHash('sha256').update(value).digest('hex')
const inside = (root, path) => {
  const local = relative(root, path)
  return !isAbsolute(local) && local !== '..' && !local.startsWith('..' + sep)
}

async function resolvedParent(directory) {
  for (let folder = directory; ; folder = dirname(folder)) {
    try {
      const path = await realpath(folder)
      if (!(await lstat(path)).isDirectory()) throw Object.assign(new Error('Theme build location must be a directory: ' + folder), { code: 'ERR_FILE_EXISTS' })
      return path
    }
    catch (error) { if (error.code !== 'ENOENT') throw error }
  }
}
export async function compileThemeArtifacts(directory, library, themes, destination, options) {
  const family = options.family
  const first = themes[0]
  const stem = family ? options['family-key'] : 'theme'
  if (family && (!stemPattern.test(stem ?? '') || themes.some(theme => theme.id === stem))) throw new Error('Choose a unique lower-kebab --family-key')
  if (!family && options['family-key']) throw new Error('--family-key requires --family')
  if (family && new Set(themes.map(theme => theme.id)).size !== themes.length) throw new Error('A family needs unique theme IDs')
  if (family && themes.length < 2) throw new Error('A theme family needs at least two themes')
  const namedCSS = !family && destination?.endsWith('.css')
  if (destination && /\.(?:d\.ts|d\.mts|css\.map)$/.test(destination)) throw new Error('Specify a .css file or a directory')
  const base = resolve(directory, destination ?? 'theme-dist')
  const path = namedCSS ? base : resolve(base, stem + '.css')
  const outputDir = dirname(path)
  const name = basename(path, '.css')
  if (!options.check && !options['dry-run']) {
    const root = await realpath(directory)
    if (!inside(directory, outputDir) || !inside(root, await resolvedParent(outputDir))) throw new Error('Choose a theme build location inside the working folder')
  }
  const bundles = themes.map(theme => library.exportBrandTheme(theme))
  const fonts = options.fonts ?? await resolveThemeFonts(directory, themes, options.observe)
  const authored = themes.map(theme => theme.id).join(', ')
  const header = '// ' + marker + ' · ' + authored + '\n'
  const icons = options['icons-specifier']
  if (icons !== undefined && (!icons.trim() || /[\s\u0000-\u001f]/.test(icons))) throw new Error('Specify an icon registry module with --icons-specifier')
  const iconImport = icons ? 'export { default as icons } from ' + JSON.stringify(icons) + '\n' : ''
  const iconType = icons ? 'export declare const icons: import("@syntrofic/ui").IconSet\n' : ''
  const files = {
    [name + '.css']: ['/* ' + marker + ' · ' + authored + ' */', fonts.css, ...bundles.map(bundle => bundle['theme.css'])].filter(Boolean).join('\n'),
    [name + '.mjs']: header + iconImport + (family
      ? 'export const themes = ' + text(Object.fromEntries(themes.map(theme => [theme.id, theme]))) + '\nexport default themes\n'
      : 'export const theme = ' + text(first) + '\nexport const colorModes = ' + text(Object.keys(first.modes)) + '\nexport default theme\n'),
    [name + '.d.mts']: header + 'import type { BrandTheme } from "@syntrofic/ui"\n' + iconType + (family
      ? 'export declare const themes: Readonly<Record<' + themes.map(theme => JSON.stringify(theme.id)).join(' | ') + ', BrandTheme>>\nexport default themes\n'
      : 'export declare const theme: BrandTheme\nexport declare const colorModes: readonly ("light" | "dark")[]\nexport default theme\n'),
  }
  const singleDirectory = !family && !namedCSS
  if (singleDirectory) {
    Object.assign(files, Object.fromEntries(Object.entries(bundles[0]).filter(([file]) => file !== 'theme.css')))
    const palette = themeEditorPalette(library, first)?.palette
    if (palette) files[paletteName] = text(palette) + '\n'
  }
  const receiptName = '.' + name + '.build.json'
  const stamp = await readThemeOutput(resolve(outputDir, receiptName))
  const previousFiles = stamp ? JSON.parse(stamp) : {}
  files[receiptName] = text(Object.fromEntries(Object.entries(files).map(([file, value]) => [file, digest(value)]))) + '\n'
  if (options.sourceFiles?.some(source => Object.keys(files).some(file => resolve(outputDir, file) === source))) {
    throw new Error('Theme build output would replace its source')
  }
  const snapshots = await Promise.all(Object.entries(files).map(async ([file, expected]) => ({ file, expected, previous: await readThemeOutput(resolve(outputDir, file)) })))
  if (singleDirectory && !Object.hasOwn(files, paletteName) && previousFiles[paletteName]) {
    const previous = await readThemeOutput(resolve(outputDir, paletteName))
    if (previous !== undefined && digest(previous) === previousFiles[paletteName]) snapshots.push({ file: paletteName, previous, expected: undefined })
  }
  const changes = snapshots.filter(item => item.previous !== item.expected)
  const result = { directory: outputDir, theme: first.id, themes: themes.map(theme => theme.id), files: Object.keys(files),
    ...(fonts.notes.length && { fontNotes: fonts.notes }),
    stale: changes.map(item => item.file), ...(options.check && { upToDate: !changes.length }), written: false }
  if (options.check || options['dry-run']) return result
  if (!options.overwrite && !options.write) {
    const protectedFiles = changes.filter(item => item.previous !== undefined && item.file !== receiptName
      && previousFiles[item.file] !== digest(item.previous))
    if (protectedFiles.length) throw Object.assign(
      new Error('Theme output already exists: ' + resolve(outputDir, protectedFiles[0].file)), { code: 'ERR_FILE_EXISTS' })
  }
  if (changes.length) {
    if (options.stage) options.stage(outputDir, changes)
    else await writeThemeOutputs(outputDir, changes)
    result.written = true
  }
  return result
}
