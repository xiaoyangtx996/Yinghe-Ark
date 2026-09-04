/**
 * Beginner-facing genre packs (P1).
 * Distilled from drama-skills genre cards — prompt constraints only, not full craft docs.
 */

export type GenrePackId = 'urban_slice' | 'romance_mogul' | 'mystery_rules'

export type GenrePackOption = {
  value: GenrePackId
  label: string
  labelEn: string
  description: string
  descriptionEn: string
  /** Short constraint injected into analysis / image prompts */
  promptZh: string
  promptEn: string
  enabled: boolean
}

const ALL_GENRE_PACKS: readonly GenrePackOption[] = [
  {
    value: 'urban_slice',
    label: '都市生活流',
    labelEn: 'Urban Slice of Life',
    description: '小人物小事，真实日常回报',
    descriptionEn: 'Ordinary goals, grounded everyday payoffs',
    promptZh:
      '题材约束（都市生活流）：聚焦普通人守住一件具体小事；压力来自匮乏/时间/面子；回报尺度小但必须可见；避免无因果的打脸翻盘与空泛鸡汤。',
    promptEn:
      'Genre constraint (urban slice-of-life): focus on an ordinary person protecting one concrete small goal; pressure from scarcity/time/face; payoffs must be small but visible; avoid empty revenge flips or vague inspirational lines.',
    enabled: true,
  },
  {
    value: 'romance_mogul',
    label: '豪门婚恋',
    labelEn: 'Elite Romance',
    description: '亲密关系里的权力不对等',
    descriptionEn: 'Power imbalance inside intimacy',
    promptZh:
      '题材约束（豪门婚恋）：核心是亲密关系中的权力不对等如何被使用/反抗/重谈；财富是筹码不是炫富清单；甜与虐都要落到可执行条款、门禁、公开承认等具体变化；禁止只靠误会循环或“其实他一直爱你”抹掉伤害。',
    promptEn:
      'Genre constraint (elite romance): focus on how power imbalance in intimacy is used, resisted, and renegotiated; wealth is leverage not flex; sweet/hurt beats must land as concrete clause/access/public-admission changes; ban endless misunderstanding loops or “he always loved you” erasing harm.',
    enabled: true,
  },
  {
    value: 'mystery_rules',
    label: '悬疑规则',
    labelEn: 'Rule Mystery',
    description: '信息不足时下注并付代价',
    descriptionEn: 'Bet under incomplete info and pay costs',
    promptZh:
      '题材约束（悬疑规则）：恐惧来自可验证限制与规则冲突；每条线索要让观众有机会先看见；试探必须消耗资源；禁止无信息增量的纯惊吓切黑，禁止中途推翻已建立的规则限制。',
    promptEn:
      'Genre constraint (rule mystery): fear comes from verifiable limits and conflicting rules; clues must be audience-visible first; probes must spend resources; ban jump-scare blackouts with no info gain; do not overturn established rule limits midstream.',
    enabled: true,
  },
]

export const GENRE_PACKS: readonly GenrePackOption[] = ALL_GENRE_PACKS.filter((pack) => pack.enabled)

export const DEFAULT_GENRE_PACK_VALUE: GenrePackId | '' = GENRE_PACKS[0]?.value ?? ''

export function isGenrePackId(value: string | null | undefined): value is GenrePackId {
  return typeof value === 'string' && GENRE_PACKS.some((pack) => pack.value === value)
}

export function getGenrePackOption(value: string | null | undefined): GenrePackOption | null {
  if (!value) return null
  return GENRE_PACKS.find((pack) => pack.value === value) ?? null
}

export function getGenrePackPrompt(value: string | null | undefined, locale?: string | null): string {
  const pack = getGenrePackOption(value)
  if (!pack) return ''
  const useZh = !locale || locale.toLowerCase().startsWith('zh')
  return useZh ? pack.promptZh : pack.promptEn
}

/** Combine art-style prompt + optional genre constraint for generation. */
export function resolveVisualGenerationPrompt(input: {
  artStylePrompt: string
  genrePack?: string | null
  locale?: string | null
}): string {
  const genre = getGenrePackPrompt(input.genrePack, input.locale)
  return [input.artStylePrompt.trim(), genre.trim()].filter(Boolean).join('\n')
}

/** Map genre packs into StylePresetSelector option shape (name-only UX). */
export function genrePacksAsStylePresetOptions(): readonly {
  value: string
  label: string
  description: string
  enabled: boolean
}[] {
  return GENRE_PACKS.map((pack) => ({
    value: pack.value,
    label: pack.label,
    description: pack.description,
    enabled: pack.enabled,
  }))
}
