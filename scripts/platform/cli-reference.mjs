import { astryxCoverage } from './catalog.mjs'
import { themeCapabilities } from './theme.mjs'
import { editorInitialDials } from './theme-editor.mjs'
import { integrationCapabilities, integrationDiagnostics } from './integration.mjs'
import { iconCapabilities } from './icon.mjs'
import { templateCapabilities } from './template.mjs'

export const cliOptions = {
  ...Object.fromEntries(editorInitialDials.map(name => [name, { type: 'string' }])),
  json: { type: 'boolean' }, id: { type: 'string' }, ci: { type: 'boolean' }, write: { type: 'boolean' }, native: { type: 'boolean' }, out: { type: 'string' },
  source: { type: 'string' }, manager: { type: 'string' }, 'dry-run': { type: 'boolean' }, name: { type: 'string' }, preset: { type: 'string' },
  extends: { type: 'string' }, parent: { type: 'string' }, integration: { type: 'string' },
  seed: { type: 'string' }, category: { type: 'string' }, params: { type: 'boolean' }, list: { type: 'boolean' }, strict: { type: 'boolean' }, check: { type: 'boolean' },
  set: { type: 'string' }, 'path-data': { type: 'string' }, description: { type: 'string' }, words: { type: 'string' }, remove: { type: 'boolean' },
  index: { type: 'boolean' }, full: { type: 'boolean' }, depth: { type: 'string' }, detail: { type: 'string' },
  built: { type: 'string' },
  like: { type: 'string' }, on: { type: 'string' }, mode: { type: 'string' }, theme: { type: 'string' },
  title: { type: 'string' }, overwrite: { type: 'boolean', short: 'f' }, reverse: { type: 'boolean' },
  from: { type: 'string' }, path: { type: 'string' }, apply: { type: 'boolean' }, force: { type: 'boolean' },
  codemod: { type: 'string' }, 'skip-codemod': { type: 'string', multiple: true },
  package: { type: 'string' }, output: { type: 'string' }, registry: { type: 'boolean' },
  type: { type: 'string' }, limit: { type: 'string' }, verbose: { type: 'boolean' },
  components: { type: 'boolean' }, installed: { type: 'boolean' }, available: { type: 'boolean' },
  skeleton: { type: 'boolean' }, replaces: { type: 'string' }, cdn: { type: 'boolean' },
  props: { type: 'boolean' }, showcase: { type: 'boolean' }, blocks: { type: 'boolean' }, preview: { type: 'string' },
  family: { type: 'boolean' }, 'family-key': { type: 'string' },
  'icons-specifier': { type: 'string' }, watch: { type: 'boolean', short: 'w' },
  template: { type: 'string' }, top: { type: 'string' }, route: { type: 'string' },
  features: { type: 'string' },
  once: { type: 'boolean' }, user: { type: 'boolean' }, 'remove-agents': { type: 'boolean' },
  'agent-docs-path': { type: 'string', multiple: true },
  when: { type: 'string', multiple: true }, except: { type: 'string', multiple: true }, at: { type: 'string', multiple: true }, 'pixel-ratio': { type: 'string' }, state: { type: 'string' }, only: { type: 'boolean' }, section: { type: 'string' }, png: { type: 'boolean' },
  adapter: { type: 'string' }, exclude: { type: 'string' }, variants: { type: 'string' }, 'default-variant': { type: 'string' }, 'display-name': { type: 'string' },
  pairs: { type: 'string' }, definition: { type: 'string' }, 'new-definition': { type: 'string' }, icon: { type: 'string' },
  variant: { type: 'string' }, backup: { type: 'string', multiple: true }, default: { type: 'boolean' }, all: { type: 'boolean' },
  definitions: { type: 'boolean' }, 'all-icons': { type: 'boolean' },
  reason: { type: 'string' }, 'additional-context': { type: 'string' }, to: { type: 'string' },
  'confirm-public': { type: 'boolean' }, 'list-categories': { type: 'boolean' }, agent: { type: 'boolean' }, 'docs-only': { type: 'boolean' },
}

export function cliOptionsFor(command) {
  return command === 'component' ? { ...cliOptions, source: { type: 'boolean' } } : cliOptions
}

const definitions = {
  help: ['', 'Print the available commands'],
  init: ['[vue|nuxt|native]', 'Create a project'],
  install: ['', 'Install the Syntrofic package'],
  'install-pro': ['<registry> <version>', 'Install the private Pro package'],
  remove: ['', 'Remove the Syntrofic package'],
  upgrade: ['[--from version|--list|--registry] [--apply]', 'Update the package, migrate source or refresh component copies'],
  list: ['[query]', 'List catalog entries'],
  search: ['<query> [--type domain] [--limit count]', 'Search components, hooks, documents, templates and themes'],
  info: ['<entry>', 'Read a catalog entry'],
  component: ['[entry]', 'List components or print a component reference'],
  docs: ['[topic|export] [section]', 'Read or export reference material'],
  coverage: ['[query]', 'Audit the Astryx reference'],
  'gap-report': ['[component]', 'Draft and route a design system gap report'],
  discover: ['[query] [--type kind] [--installed|--available] [--limit count]', 'Discover installed and available packages and contributions'],
  blog: ['[id]', 'Read the release notes feed'],
  build: ['[description]', 'Recommend a starting Vue template and related building blocks'],
  template: ['[name] [path]', 'List, inspect or scaffold Vue templates'],
  mcp: ['[--docs-only]', 'Serve CLI tools through MCP over standard input and output'],
  hook: ['[name]', 'Find a composable or interaction function'],
  manifest: ['', 'Output the CLI capability manifest'],
  figma: ['', 'Scaffold the local Figma plugin'],
  migrate: ['<file>', 'Update legacy imports'],
  doctor: ['[--built path]', 'Check project dependencies and finished builds'],
  integration: ['[action]', 'Scaffold and validate contributions from a Vue package'],
  swizzle: ['[component] [--list] [--output folder]', 'Copy a Vue component and its local dependencies'],
  design: ['', 'Create DESIGN.md'],
  agents: ['', 'Create AGENTS.md'],
  theme: ['[action]', 'Create, build, choose and inspect themes'],
  experimental: ['theme|icon|export|import <action>', 'Access local theme, icon and page workflows'],
}

export const cliCommands = Object.keys(definitions)
const commandOptions = {
  help: ['json'], init: ['native', 'source', 'out', 'dry-run', 'features', 'all', 'to', 'once', 'remove', 'remove-agents', 'user', 'agent', 'agent-docs-path'], install: ['native', 'manager', 'source', 'out', 'dry-run'],
  'install-pro': ['ci', 'manager', 'out', 'dry-run'], remove: ['native', 'manager', 'out', 'dry-run'],
  upgrade: ['native', 'manager', 'source', 'from', 'apply', 'list', 'path', 'force', 'codemod', 'skip-codemod', 'integration', 'registry', 'out', 'dry-run', 'json'],
  list: ['json'], search: ['type', 'limit', 'verbose', 'json', 'out'], info: ['json'],
  component: ['list', 'category', 'package', 'props', 'source', 'showcase', 'blocks', 'json'],
  docs: ['list', 'index', 'full', 'depth', 'detail', 'json', 'out', 'dry-run'], coverage: ['json'],
  'gap-report': ['category', 'reason', 'additional-context', 'package', 'to', 'confirm-public', 'list-categories', 'agent', 'dry-run', 'out', 'json'],
  discover: ['type', 'installed', 'available', 'components', 'limit', 'json', 'out'], blog: ['json', 'source', 'out'],
  build: ['list', 'type', 'limit', 'verbose', 'json', 'source', 'out', 'dry-run'],
  template: ['list', 'type', 'package', 'skeleton', 'cdn', 'overwrite', 'json', 'source', 'out', 'dry-run'], mcp: ['docs-only'],
  hook: ['list', 'category', 'params', 'json'], manifest: ['json'], figma: ['id', 'out', 'dry-run'],
  migrate: ['write', 'out', 'dry-run'], doctor: ['native', 'built', 'out', 'strict'], integration: ['type', 'replaces', 'extends', 'parent', 'from', 'to', 'dry-run', 'out', 'strict', 'check'],
  swizzle: ['list', 'package', 'out', 'output', 'overwrite', 'dry-run'], design: ['out', 'dry-run'], agents: ['out', 'dry-run'],
  theme: ['source', 'name', 'preset', 'seed', 'theme', 'id', 'like', 'on', 'when', 'except', 'at', 'pixel-ratio', 'state', 'only', 'section', 'png', 'mode', 'out', 'dry-run', 'preview', 'overwrite', 'family', 'family-key', 'check', 'icons-specifier', 'watch', 'template', 'top', 'route', 'package', 'list', ...editorInitialDials],
  experimental: ['source', 'name', 'preset', 'seed', 'theme', 'id', 'like', 'on', 'when', 'except', 'at', 'pixel-ratio', 'state', 'only', 'section', 'png', 'mode', 'out', 'dry-run', 'reverse',
    'overwrite', 'path-data', 'description', 'words', 'remove', 'title', 'preview', 'family', 'family-key', 'check', 'icons-specifier', 'watch', 'template', 'top', 'route', 'package', 'list',
    'from', 'set', 'adapter', 'exclude', 'variants', 'default-variant', 'display-name', 'pairs', 'definition', 'new-definition',
    'icon', 'variant', 'backup', 'default', 'all', 'definitions', 'all-icons', 'limit', ...editorInitialDials],
  postinstall: [],
}
const argument = (name, required = false, details = {}) => ({ name, required, type: 'string', ...details })
const commandArguments = {
  init: [argument('framework', false, { values: ['vue', 'nuxt', 'native'] })],
  'install-pro': [argument('registry', true), argument('version', true)],
  list: [argument('query', false, { variadic: true })],
  search: [argument('query', true, { variadic: true })],
  info: [argument('entry', true, { variadic: true })],
  component: [argument('entry', false, { variadic: true })],
  docs: [argument('topic'), argument('section', false, { variadic: true })],
  coverage: [argument('query', false, { variadic: true })],
  'gap-report': [argument('component', false, { variadic: true })],
  discover: [argument('query', false, { variadic: true })],
  blog: [argument('id')],
  build: [argument('description', false, { variadic: true })],
  template: [argument('name'), argument('path')],
  hook: [argument('name')],
  migrate: [argument('file', true)],
  integration: [argument('action'), argument('kind'), argument('name')],
  swizzle: [argument('component', false, { variadic: true })],
  theme: [argument('action'), argument('entry', false, { variadic: true })],
  experimental: [argument('domain'), argument('action'), argument('arguments', false, { variadic: true })],
}
const optionChoices = {
  manager: ['pnpm', 'npm', 'yarn', 'bun'], detail: ['brief', 'compact', 'full'],
}
const schema = {
  entry: { type: 'object', required: ['id', 'name'], properties: { id: { type: 'string' }, name: { type: 'string' } } },
  ranked: { type: 'object', required: ['id', 'name', 'type', 'score', 'command'], properties: {
    id: { type: 'string' }, name: { type: 'string' }, type: { enum: ['component', 'hook', 'doc', 'template', 'theme'] },
    score: { type: 'number' }, command: { type: 'string' },
  } },
  package: { type: 'object', required: ['name', 'installed', 'install', 'entries'], properties: {
    name: { type: 'string' }, installed: { type: 'boolean' }, install: { type: 'string' }, entries: { type: 'array' },
  } },
}
const responses = {
  list: { type: 'array', items: schema.entry },
  search: { type: 'array', items: schema.ranked },
  discover: { type: 'object', anyOf: [{ required: ['packages'] }, { required: ['package', 'entries'] }, { required: ['package', 'entry'] }],
    properties: { packages: { type: 'array', items: schema.package }, entries: { type: 'array' }, entry: schema.entry } },
  info: schema.entry,
  component: { oneOf: [schema.entry, { type: 'array', items: schema.entry }] },
  coverage: { type: 'object', required: ['repository', 'revision', 'entries'] },
  'gap-report': { type: 'object', anyOf: [{ required: ['status', 'report'] }, { required: ['categories'] }, { required: ['repository', 'revision', 'entries'] }] },
  hook: { oneOf: [{ type: 'array' }, { type: 'object', required: ['name', 'parameters'] }] },
  manifest: { type: 'object', required: ['version', 'name', 'commands', 'options'] },
  help: { type: 'object', required: ['type', 'data'], properties: { type: { const: 'help' }, data: { type: 'object', required: ['manifest'] } } },
  blog: { oneOf: [{ type: 'array' }, { type: 'object', required: ['title', 'date', 'body'] }] },
  docs: { anyOf: [{ type: 'array' }, { type: 'object', required: ['route', 'title'] }, schema.entry] },
  init: { type: 'object', required: ['directory', 'files'], anyOf: [{ required: ['type'] }, { required: ['mode'] }] },
  doctor: { type: 'object' },
  integration: { type: 'object' },
  swizzle: { anyOf: [{ type: 'array' }, { type: 'object' }] },
  template: { anyOf: [{ type: 'array' }, { type: 'object' }] },
  theme: { anyOf: [{ type: 'array' }, { type: 'object' }] },
}

function option(name, command) {
  const { type, multiple, short } = cliOptionsFor(typeof command === 'string' ? command : undefined)[name]
  const choices = optionChoices[name]
  return { name: '--' + name, type, ...(multiple && { multiple: true }), ...(choices && { values: choices }),
    ...(short && { short: '-' + short }),
    ...(name === 'limit' && { valueType: 'integer' }) }
}
const commandsWithChildren = {
  theme: themeCapabilities,
  experimental: [...themeCapabilities.map(action => 'theme ' + action), ...iconCapabilities.map(action => 'icon ' + action), 'export <page.vue>', 'import <page.html>'],
  integration: integrationCapabilities,
  doctor: integrationDiagnostics.map(check => 'integration ' + check + ' [integration]'),
  template: templateCapabilities,
}
function describeAction(usage) {
  return {
    name: usage.split(/\s+(?=<|\[)/, 1)[0],
    arguments: Array.from(usage.matchAll(/<([^>]+)>|\[([^\]]+)\]/g), ([, required, optional]) => argument(required ?? optional, Boolean(required))),
  }
}
export function cliManifest() {
  const commands = Object.entries(definitions).map(([name, [usage, summary]]) => {
    const subcommands = commandsWithChildren[name]
    return {
      name, usage, summary, arguments: commandArguments[name] ?? [], flags: (commandOptions[name] ?? []).map(flag => option(flag, name)),
      ...(responses[name] && { response: responses[name] }),
      ...(subcommands && { subcommands, subcommandDetails: subcommands.map(describeAction) }),
    }
  })
  return {
    version: 1, name: 'syntrofic', commands,
    options: Object.keys(cliOptions).map(option),
  }
}

const documentedHooks = {
  createAnimatedLayout: { category: 'motion', parameters: ['options'], signature: 'createAnimatedLayout({ scope, spring })' },
  createAnimator: { category: 'motion', parameters: ['element'], signature: 'createAnimator(element).animate(channel, keyframes, options)' },
  useAnimator: { category: 'motion', parameters: ['target'], signature: 'useAnimator(target).animate({ x, scale, opacity }, { velocity })' },
  createDragToSnapPoints: { category: 'motion', parameters: ['element', 'options'], signature: 'createDragToSnapPoints(element, { points, initial, axis, onChange })' },
  createPanGesture: { category: 'motion', parameters: ['element', 'options'] },
  createTransformGesture: { category: 'motion', parameters: ['element', 'options'] },
  usePanGesture: { category: 'motion', parameters: ['target', 'options'], signature: 'usePanGesture(target, { axis, onPan })' },
  useTransformGesture: { category: 'motion', parameters: ['target', 'options'], signature: 'useTransformGesture(target, { onMove })' },
  useScrollLock: { category: 'interaction', parameters: ['locked', 'document'] },
  createReorderable: { category: 'motion', parameters: ['element', 'options'] },
  useAnimatedLayout: { category: 'motion', parameters: [] },
  reportLayoutChange: { category: 'motion', parameters: ['layout', 'target'], signature: 'reportLayoutChange(layout, target).measureBefore()' },
  useEntryAnimation: { category: 'motion', parameters: ['target', 'preset'] },
  useFocusTrap: { category: 'accessibility', parameters: ['options'], signature: 'useFocusTrap({ isActive, container, onEscape })' },
  usePopover: { category: 'interaction', parameters: ['options'], signature: 'usePopover({ anchor, tabBehavior })' },
  useLayer: { category: 'interaction', parameters: ['options'], signature: 'useLayer({ mode, lightDismiss, lazyMount }).render(content, props)' },
  useTooltip: { category: 'interaction', parameters: ['options'], signature: 'useTooltip({ placement, focusTrigger, touchTrigger }).renderTooltip(content)' },
  useHoverCard: { category: 'interaction', parameters: ['options'], signature: 'useHoverCard({ placement, label }).renderHoverCard(content)' },
  useMenuPress: { category: 'interaction', parameters: ['options'], signature: 'useMenuPress({ menuRef, itemSelector, onTriggerPress })' },
  useToast: { category: 'interaction', parameters: [], signature: 'useToast()(options)' },
  useCalendarConstraints: { category: 'calendar', parameters: ['options'] },
  useCalendarDays: { category: 'calendar', parameters: ['options'] },
  useCalendarNavigation: { category: 'calendar', parameters: ['options'] },
  useAppShellMobile: { category: 'layout', parameters: [], signature: 'useAppShellMobile().isMobileNavOpen' },
  useResizable: { category: 'layout', parameters: ['options'], signature: 'useResizable({ defaultSize, containerRef, collapsible })' },
  useStreamingText: { category: 'streaming', parameters: ['targetText', 'isStreaming', 'options'] },
  useSpeechRecognition: { category: 'speech', parameters: ['options'] },
  useChatDictation: { category: 'speech', parameters: ['options'], signature: 'useChatDictation({ inputRef, lang, onResult })' },
  useChatPasteAsToken: { category: 'chat', parameters: ['inputRef', 'options'], signature: 'useChatPasteAsToken(inputRef, { threshold, toToken })' },
  useInputStatusIcon: { category: 'accessibility', parameters: ['options'], signature: 'useInputStatusIcon({ status, statusVariant, isInGroup }).statusIcon' },
  useAnnounce: { category: 'accessibility', parameters: ['source'] },
  useCollator: { category: 'i18n', parameters: ['options'] },
  useDirection: { category: 'i18n', parameters: [] },
  useLocale: { category: 'i18n', parameters: [] },
  useTranslator: { category: 'i18n', parameters: ['fallback'] },
  useClipboard: { category: 'interaction', parameters: ['target'] },
  useHotkeys: { category: 'interaction', parameters: ['keys', 'target'] },
  useLongPress: { category: 'interaction', parameters: ['target', 'handler', 'options'] },
  useMediaQuery: { category: 'layout', parameters: ['query', 'initial'] },
  useMediaPlayer: { category: 'media', parameters: [], signature: 'useMediaPlayer().state' },
  useMediaPlaybackTime: { category: 'media', parameters: [], signature: 'useMediaPlaybackTime().value' },
  useOverflow: { category: 'layout', parameters: ['itemCount', 'options'] },
  useScrollableArea: { category: 'layout', parameters: ['options'] },
  useSnapPaging: { category: 'motion', parameters: ['options'] },
  useDragToSnapPoints: { category: 'motion', parameters: ['target', 'options'], signature: 'useDragToSnapPoints(target, options).settleTo(point)' },
  useListFocus: { category: 'focus', parameters: ['options'] },
  useKeyboardHint: { category: 'focus', parameters: ['options'] },
  useLinkComponent: { category: 'navigation', parameters: ['component'] },
  usePressFeedback: { category: 'motion', parameters: [] },
  useContainerReveal: { category: 'interaction', parameters: ['config'] },
  useInputContainer: { category: 'interaction', parameters: ['options'] },
  useIndicatorFocusRing: { category: 'focus', parameters: ['target', 'disabled'] },
  useInteractiveRole: { category: 'accessibility', parameters: ['options'], signature: 'useInteractiveRole(options).semantic' },
  useTheme: { category: 'theme', parameters: [] },
  useIcon: { category: 'theme', parameters: ['name', 'variant', 'size'], signature: 'useIcon(name, variant, size).value' },
  useSyntaxTheme: { category: 'theme', parameters: [] },
  useImageMode: { category: 'media', parameters: ['source', 'options'] },
  useCollapsible: { category: 'interaction', parameters: ['options'] },
  useGridFocus: { category: 'focus', parameters: ['options'] },
  useTreeFocus: { category: 'focus', parameters: ['options'] },
  useTypeahead: { category: 'focus', parameters: ['options'] },
  useCombobox: { category: 'focus', parameters: ['options'], signature: 'useCombobox({ selectableItems, isOpen, onOpen, onClose, listboxId })' },
  useMultiCombobox: { category: 'focus', parameters: ['options'], signature: 'useMultiCombobox({ selectableItems, isOpen, onToggle, listboxId })' },
  useScrollOverflow: { category: 'layout', parameters: ['target', 'options'] },
  useTablePagination: { category: 'table', parameters: ['options'] },
  useTableColumnResize: { category: 'table', parameters: ['options'] },
  useTableColumnSettings: { category: 'table', parameters: ['options'] },
  useTableColumnSettingsState: { category: 'table', parameters: ['options'] },
  useTableColumnsVirtualization: { category: 'table', parameters: ['options'] },
  useTableStickyColumns: { category: 'table', parameters: ['options'] },
  useTableFiltering: { category: 'table', parameters: ['options'] },
  useTableFilterState: { category: 'table', parameters: ['initial'] },
  useTableGroupedRows: { category: 'table', parameters: ['options'], signature: 'useTableGroupedRows(options).control' },
  useTableInfiniteScroll: { category: 'table', parameters: ['options'] },
  useTableRowExpansion: { category: 'table', parameters: ['options'] },
  useTableRowIndex: { category: 'table', parameters: ['options'], signature: 'useTableRowIndex(options)' },
  useTableRowsVirtualization: { category: 'table', parameters: ['options'] },
  useTableTreeData: { category: 'table', parameters: ['options'] },
  useTableTreeState: { category: 'table', parameters: ['options'] },
  useTableSelection: { category: 'table', parameters: ['options'] },
  useTableSelectionState: { category: 'table', parameters: ['options'] },
  useTableSortableState: { category: 'table', parameters: ['options'] },
  useTruncation: { category: 'layout', parameters: ['target'] },
}

const hookGuides = {
  useFocusTrap: { summary: 'Restrict keyboard focus to a live overlay and restore it on dismissal.', parameters: { options: 'The overlay container, active state, optional Escape callback and restoreFocus.' } },
  useLayer: { summary: 'Position custom popovers in the browser top layer.', parameters: { options: 'Use context or fixed mode with optional light dismissal and lazy mounting.' } },
  useResizable: { summary: 'Resolve and save a pixel-sized layout region with optional collapse and snap points.',
    parameters: { options: 'Configure size bounds, a measuring container, the axis, collapse state, snap points and persistence.' } },
  useCalendarNavigation: { summary: 'Track visible months and the next keyboard focus date.', parameters: { options: 'Set calendar, locale, visible month count and a controlled or initial ISO focus date.' } },
  useMenuPress: { summary: 'Act on the enabled menu item under the released pointer.', parameters: { options: 'Provide the menu and optional trigger, item selector, callbacks and long-press delay.' } },
}

export async function hookCommand(name, options = {}) {
  const { entries } = await astryxCoverage()
  const references = new Map(entries.filter(entry => entry.group === 'utility').map(entry => [entry.name, entry.source]))
  const hooks = Object.entries(documentedHooks).map(([name, detail]) => ({
    name, ...detail, reference: references.get(name), summary: hookGuides[name]?.summary,
    parameterDetails: detail.parameters.map(parameter => ({ name: parameter, description: hookGuides[name]?.parameters[parameter] })),
  }))
  const category = options.category?.toLowerCase()
  if (category && !hooks.some(item => item.category === category)) throw new Error('Unknown hook category: ' + options.category)
  if (options.params && (!name || options.list)) throw new Error('Specify one hook for --params')
  const selected = hooks.filter(item => !category || item.category === category)
  if (!name || options.list) return selected
  const match = selected.find(item => item.name.toLowerCase() === name.toLowerCase())
  if (!match) throw new Error('Unknown hook: ' + name)
  return options.params ? { name: match.name, parameters: match.parameters, parameterDetails: match.parameterDetails } : match
}

export function formattedHook(result) {
  if (!Array.isArray(result)) {
    const parameters = result.parameterDetails.map(item => [item.name, item.description].filter(Boolean).join('\t'))
    if (!result.category) return parameters.join('\n')
    return [result.signature ?? `${result.name}(${result.parameters.join(', ')})`, result.summary, ...parameters, result.reference].filter(Boolean).join('\n')
  }
  const categories = new Map()
  for (const hook of result) {
    const group = categories.get(hook.category) ?? []
    group.push(hook.name)
    categories.set(hook.category, group)
  }
  return [...categories].sort(([a], [b]) => a.localeCompare(b)).map(([key, hooks]) =>
    [key, ...hooks.map(name => '  ' + name)].join('\n')).join('\n\n')
}
