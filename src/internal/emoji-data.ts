export type EmojiLocale = 'en' | 'zh'
export type EmojiTone = 0 | 1 | 2 | 3 | 4 | 5

export interface EmojiChoice {
  glyph: string
  label: string
}

export interface EmojiOption extends EmojiChoice {
  keywords?: readonly string[]
  tones?: Partial<Record<EmojiTone, EmojiChoice>>
}

export interface EmojiCategory {
  id: string
  label: string
  items: readonly EmojiOption[]
}

interface DatasetEmoji {
  group?: number
  hexcode: string
  label: string
  emoji: string
  version?: number
  tags?: string[]
  skins?: DatasetEmoji[]
}

const datasets = new Map<EmojiLocale, Promise<EmojiCategory[]>>()

export function loadEmojiCategories(locale: EmojiLocale): Promise<EmojiCategory[]> {
  const cached = datasets.get(locale)
  if (cached) return cached
  const request = (locale === 'zh'
    ? Promise.all([import('emojibase-data/zh/data.json'), import('emojibase-data/zh/messages.json')])
    : Promise.all([import('emojibase-data/en/data.json'), import('emojibase-data/en/messages.json')])
  ).then(([data, messages]) => {
    const categories = messages.default.groups
      .filter(group => group.key !== 'component')
      .map(group => ({ id: group.key, label: group.message, order: group.order, items: [] as EmojiOption[] }))
    const groups = new Map(categories.map(group => [group.order, group.items]))
    const emojiData = data.default as DatasetEmoji[]
    // Keep newer glyphs reachable without putting them before broadly supported choices.
    const recentVersion = (emoji: DatasetEmoji) => Number((emoji.version ?? 0) > 16)
    const ordered = [...emojiData].sort((a, b) => recentVersion(a) - recentVersion(b))
    for (const emoji of ordered) {
      const items = emoji.group === undefined ? undefined : groups.get(emoji.group)
      if (!items) continue
      const tones: EmojiOption['tones'] = {}
      for (const skin of emoji.skins ?? []) {
        const modifiers = skin.hexcode.match(/1F3F[B-F]/g)
        if (modifiers?.length === 1) {
          const tone = Number.parseInt(modifiers[0], 16) - 0x1f3fa as EmojiTone
          tones[tone] = { glyph: skin.emoji, label: skin.label }
        }
      }
      items.push({ glyph: emoji.emoji, label: emoji.label, keywords: emoji.tags, tones })
    }
    return categories
  }).catch(error => {
    datasets.delete(locale)
    throw error
  })
  datasets.set(locale, request)
  return request
}
