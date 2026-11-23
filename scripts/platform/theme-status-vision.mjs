import { hexOf, linearSRGB, linearSRGBToHex, linearSRGBToLab, multiply } from './theme-palette.mjs'

const statuses = ['success', 'warning', 'danger', 'info']
const threshold = .06
const clamp = value => Math.max(0, Math.min(1, value))

// Machado, Oliveira and Fernandes, 2009, supplementary linear sRGB matrices.
const simulations = {
  protanomaly: { severity: .6, matrix: [[.385450, .769005, -.154455], [.100526, .829802, .069673], [-.007442, -.022190, 1.029632]] },
  deuteranomaly: { severity: .6, matrix: [[.498864, .674741, -.173604], [.205199, .754872, .039929], [-.011131, .030969, .980162]] },
  protanopia: { severity: 1, matrix: [[.152286, 1.052583, -.204868], [.114503, .786281, .099216], [-.003882, -.048116, 1.051998]] },
  deuteranopia: { severity: 1, matrix: [[.367322, .860646, -.227968], [.280085, .672501, .047413], [-.011820, .042940, .968881]] },
}

const statusToken = tone => '--sy-' + tone
const visionWord = /\b(?:colou?r[-\s]?blind(?:ness)?|colou?r vision deficienc(?:y|ies)|cvd|protan(?:opia|omaly)|deuteran(?:opia|omaly)|red[-\s]green)\b|红绿色盲|红绿色弱|红绿辨色|(?:红绿)?色觉(?:差异|缺陷)|色盲|色弱/iu
const reviewWords = /\b(?:are|is|can|what|which|all|the|my|these|this|colou?rs?|status(?:es)?|palette|differ|tell|apart|check|inspect|they|them|people|users?|safe|accessible|friendly|make|for|it|with|see|distinguish|simulation|review)\b/giu

export function statusVisionRequest(subject) {
  if (!visionWord.test(subject) && !/^(?:status colou?rs?|状态色(?:检查|诊断)?)$/iu.test(subject)) return
  const clauses = subject.split(/[;；]/u).flatMap(clause => {
    if (!visionWord.test(clause)) return clause.trim() ? [clause.trim()] : []
    const mention = visionWord.exec(clause)
    const prefix = clause.slice(0, mention.index)
    const suffix = clause.slice(mention.index + mention[0].length)
    const remainder = (prefix.replace(/(?:\s+(?:for|to)\s*|[对给为])$/iu, '') + ' ' + suffix.replace(/^(?:[-\s]*(?:friendly|safe|readers?|users?|people)\b|用户|读者|友好)+/iu, ' ')).trim()
    const substantive = remainder.replace(reviewWords, '').replace(/状态(?:颜?色)?|检查|诊断|能否|能|区分|分辨|友好|吗|下|对|给|为|的/gu, '')
    return /[\p{L}\d#]/u.test(substantive) ? [remainder] : []
  })
  return { edits: /^(?:status colou?rs?|状态色(?:检查|诊断)?)$/iu.test(subject) ? '' : clauses.join('; ') }
}

function colorsFor(tokens) {
  return Object.fromEntries(statuses.map(tone => [tone, tokens[statusToken(tone)]]))
}

function readings(colors) {
  return Object.fromEntries(Object.entries(simulations).map(([vision, { matrix }]) => [vision,
    Object.fromEntries(Object.entries(colors).map(([tone, color]) => [tone, multiply(matrix, linearSRGB(color)).map(clamp)])),
  ]))
}

function issuesFor(samples) {
  const labs = Object.fromEntries(Object.entries(samples).map(([vision, tones]) => [vision,
    Object.fromEntries(Object.entries(tones).map(([tone, rgb]) => [tone, linearSRGBToLab(rgb)])),
  ]))
  return statuses.flatMap((first, index) => statuses.slice(index + 1).flatMap(second => {
    const matches = Object.entries(labs).flatMap(([vision, tones]) => {
      const distance = Math.hypot(...tones[first].map((value, i) => value - tones[second][i]))
      return distance < threshold ? [{ vision, distance: Number(distance.toFixed(5)) }] : []
    })
    return matches.length ? [{ pair: [first, second], matches }] : []
  }))
}

export function statusVisionAudit(tokensByMode, modes) {
  return {
    model: 'Machado–Oliveira–Fernandes 2009',
    distance: { space: 'OKLab', reviewBelow: threshold },
    simulations: Object.fromEntries(Object.entries(simulations).map(([vision, { severity }]) => [vision, severity])),
    modes: Object.fromEntries(modes.map(mode => {
      const colors = colorsFor(tokensByMode[mode])
      const samples = readings(colors)
      const simulated = Object.fromEntries(Object.entries(samples).map(([vision, tones]) => [vision,
        Object.fromEntries(Object.entries(tones).map(([tone, rgb]) => [tone, linearSRGBToHex(rgb)])),
      ]))
      return [mode, { colors, simulated, issues: issuesFor(samples) }]
    })),
    guidance: 'Keep visible status text or distinct icons alongside semantic colors. The simulated distance is a review heuristic.',
  }
}

const pairKey = ({ pair, matches }) => matches.map(({ vision }) => pair.join('/') + '/' + vision)

export function* statusColorAdjustments(library, tokens, issue, issues) {
  const colors = colorsFor(tokens)
  const existing = new Set(issues.flatMap(pairKey))
  const palette = Object.fromEntries(issue.pair.map(tone => [tone, linearSRGBToLab(linearSRGB(colors[tone]))]))
  const checked = new Set()
  for (let step = 1; step <= 24; step++) {
    for (const tone of [...issue.pair].reverse()) {
      const [light, a, b] = palette[tone]
      for (const shift of [-step, step]) {
        const value = hexOf([light + shift / 100, a, b])
        const key = tone + '/' + value
        if (checked.has(key)) continue
        checked.add(key)
        const canvasContrast = library.colorContrast(value, tokens['--sy-canvas'])
        const textContrast = library.colorContrast(value, tokens[statusToken(tone) + '-soft'])
        const actionContrast = tone === 'danger' ? library.colorContrast(tokens['--sy-danger-on'], value) : undefined
        if (!(canvasContrast >= 3 && textContrast >= 4.5) || tone === 'danger' && !(actionContrast >= 4.5)) continue
        const next = issuesFor(readings({ ...colors, [tone]: value }))
        if (next.some(item => item.pair.join('/') === issue.pair.join('/') || pairKey(item).some(key => !existing.has(key)))) continue
        yield { token: statusToken(tone), value, canvasContrast, textContrast, ...(actionContrast !== undefined && { actionContrast }) }
      }
    }
  }
}
