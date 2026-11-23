const legacyChartHues = ['sage', 'clay', 'blue', 'ochre', 'plum', 'teal', 'sand'] as const
const extraCategoricalHues = ['rose', 'indigo', 'olive'] as const
const categoricalHues = [...legacyChartHues, ...extraCategoricalHues] as const
const sequentialHues = ['sage', 'clay', 'blue', 'ochre', 'plum', 'teal', 'rose', 'indigo', 'gray'] as const
const steps = [1, 2, 3, 4, 5] as const

export const dataColorNames = [
  ...categoricalHues.map(hue => `data-categorical-${hue}` as const),
  'data-neutral',
  ...sequentialHues.flatMap(hue => steps.map(step => `data-sequential-${hue}-${step}` as const)),
] as const
export type DataColorToken = `--sy-${typeof dataColorNames[number]}`

export const legacyChartColorNames = legacyChartHues.map(hue => `chart-${hue}` as const)
export const categoricalChartColorNames = [
  ...legacyChartColorNames,
  ...extraCategoricalHues.map(hue => `data-categorical-${hue}` as const),
] as const
