/**
 * 分集 / 章节标记检测器
 * 兼容网文、剧本、短剧常见标题格式；本地算法，不依赖 AI。
 */

import { countWords } from './word-count'

export interface EpisodeMarkerMatch {
  index: number
  text: string
  episodeNumber: number
  titleHint?: string
}

export interface PreviewSplit {
  number: number
  title: string
  wordCount: number
  startIndex: number
  endIndex: number
  preview: string
}

export interface EpisodeMarkerResult {
  hasMarkers: boolean
  markerType: string
  markerTypeKey: string
  confidence: 'high' | 'medium' | 'low'
  matches: EpisodeMarkerMatch[]
  previewSplits: PreviewSplit[]
}

const CN_DIGITS = '零〇一二两三四五六七八九十百千万壹贰叁肆伍陆柒捌玖拾佰仟两'

const CHINESE_NUMBERS: Record<string, number> = {
  零: 0, 〇: 0,
  一: 1, 壹: 1,
  二: 2, 贰: 2, 两: 2,
  三: 3, 叁: 3,
  四: 4, 肆: 4,
  五: 5, 伍: 5,
  六: 6, 陆: 6,
  七: 7, 柒: 7,
  八: 8, 捌: 8,
  九: 9, 玖: 9,
  十: 10, 拾: 10,
  百: 100, 佰: 100,
  千: 1000, 仟: 1000,
  万: 10000,
  廿: 20, 卅: 30,
}

/** 将中文数字 / 阿拉伯数字字符串转为 number */
export function chineseToNumber(raw: string): number {
  const chinese = raw.trim()
  if (!chinese) return 0
  if (/^\d+$/.test(chinese)) return parseInt(chinese, 10)

  // 廿三 / 卅一
  if (chinese.startsWith('廿') || chinese.startsWith('卅')) {
    const base = chinese.startsWith('廿') ? 20 : 30
    const rest = chinese.slice(1)
    return rest ? base + chineseToNumber(rest) : base
  }

  let result = 0
  let section = 0
  let number = 0

  for (const char of chinese) {
    const value = CHINESE_NUMBERS[char]
    if (value === undefined) continue

    if (value === 10000) {
      section = (section + number) * value
      result += section
      section = 0
      number = 0
      continue
    }

    if (value >= 10) {
      if (number === 0) number = 1
      section += number * value
      number = 0
    } else {
      number = value
    }
  }

  return result + section + number
}

const NUM = `([${CN_DIGITS}\\d]+)`
/** 行首可有空白 / markdown 标题符号 / 装饰符 */
const LINE_START = '(?:^|[\\n\\r])[ \\t　]*[#＃]*[ \\t　]*(?:[【\\[《「『（(]+[ \\t　]*)?'

interface DetectionPattern {
  regex: RegExp
  typeKey: string
  typeName: string
  /** 语义权重：章/回/话 > 集/幕 > 编号 */
  priority: number
  extractNumber: (match: RegExpMatchArray) => number
  extractTitle: (match: RegExpMatchArray) => string
}

function cnUnitPattern(unit: string, typeKey: string, typeName: string, priority: number): DetectionPattern {
  return {
    // 第1章 / 第一章 / 第 1 章 / 第１章（全角数字）标题
    regex: new RegExp(
      `${LINE_START}第[ \\t　]*${NUM}[ \\t　]*${unit}[ \\t　]*[】\\]》」』）)]*[ \\t　]*[：:\\-—–|｜]?[ \\t　]*(.*)`,
      'gm',
    ),
    typeKey,
    typeName,
    priority,
    extractNumber: (match) => chineseToNumber(match[1]),
    extractTitle: (match) => (match[2] || '').trim().replace(/[】\》」』）)]+$/g, '').trim(),
  }
}

const DETECTION_PATTERNS: DetectionPattern[] = [
  // —— 小说最常见 ——
  cnUnitPattern('章', 'chapter', '第X章', 100),
  cnUnitPattern('回', 'hui', '第X回', 98),
  cnUnitPattern('话', 'hua', '第X话', 96),
  cnUnitPattern('节', 'jie', '第X节', 90),
  cnUnitPattern('篇', 'pian', '第X篇', 88),
  cnUnitPattern('卷', 'juan', '第X卷', 70),
  cnUnitPattern('集', 'episode', '第X集', 85),
  cnUnitPattern('幕', 'act', '第X幕', 80),

  // 章1 / 章一（少数竖排/旧式）
  {
    regex: new RegExp(`${LINE_START}章[ \\t　]*${NUM}[ \\t　]*[：:\\-—–]?[ \\t　]*(.*)`, 'gm'),
    typeKey: 'zhangNum',
    typeName: '章X',
    priority: 92,
    extractNumber: (match) => chineseToNumber(match[1]),
    extractTitle: (match) => (match[2] || '').trim(),
  },

  // 【第一章】/「第1章 标题」整行括号包裹（补充：上面 LINE_START 已含左括号，这里再兜底无「第」的纯括号标题）
  {
    regex: new RegExp(
      `${LINE_START}[【\\[《][ \\t　]*第?[ \\t　]*${NUM}[ \\t　]*[章节回话剧集幕篇]?[ \\t　]*[】\\]》][ \\t　]*(.*)`,
      'gm',
    ),
    typeKey: 'bracketChapter',
    typeName: '【章节】',
    priority: 86,
    extractNumber: (match) => chineseToNumber(match[1]),
    extractTitle: (match) => (match[2] || '').trim(),
  },

  // 英文 Chapter / Episode / Act（含 Chapter 01）
  {
    regex: new RegExp(`${LINE_START}Chapter[ \\t　]*0*(\\d+)[ \\t　]*[：:\\-—–.]?[ \\t　]*(.*)`, 'gim'),
    typeKey: 'chapterEn',
    typeName: 'Chapter X',
    priority: 94,
    extractNumber: (match) => parseInt(match[1], 10),
    extractTitle: (match) => (match[2] || '').trim(),
  },
  {
    regex: new RegExp(`${LINE_START}Episode[ \\t　]*0*(\\d+)[ \\t　]*[：:\\-—–.]?[ \\t　]*(.*)`, 'gim'),
    typeKey: 'episodeEn',
    typeName: 'Episode X',
    priority: 84,
    extractNumber: (match) => parseInt(match[1], 10),
    extractTitle: (match) => (match[2] || '').trim(),
  },
  {
    regex: new RegExp(`${LINE_START}Act[ \\t　]*0*(\\d+)[ \\t　]*[：:\\-—–.]?[ \\t　]*(.*)`, 'gim'),
    typeKey: 'actEn',
    typeName: 'Act X',
    priority: 78,
    extractNumber: (match) => parseInt(match[1], 10),
    extractTitle: (match) => (match[2] || '').trim(),
  },

  // 场景编号 1-1【场景】
  {
    regex: new RegExp(`${LINE_START}(\\d+)\\s*[-–—]\\s*\\d+[ \\t　]*[【\\[](.*?)[】\\]]`, 'gm'),
    typeKey: 'scene',
    typeName: 'X-Y【场景】',
    priority: 75,
    extractNumber: (match) => parseInt(match[1], 10),
    extractTitle: (match) => (match[2] || '').trim(),
  },

  // 1. 标题 / 1、标题 / 1：标题
  {
    regex: new RegExp(`${LINE_START}(\\d{1,4})[\\.、：:][ \\t　]*(.{2,40})\\s*$`, 'gm'),
    typeKey: 'numbered',
    typeName: '数字编号',
    priority: 40,
    extractNumber: (match) => parseInt(match[1], 10),
    extractTitle: (match) => (match[2] || '').trim().slice(0, 40),
  },

  // Markdown 转义 1\. 标题
  {
    regex: new RegExp(`${LINE_START}(\\d{1,4})\\\\\\.[ \\t　]*(.{2,40})\\s*$`, 'gm'),
    typeKey: 'numberedEscaped',
    typeName: '数字编号(转义)',
    priority: 38,
    extractNumber: (match) => parseInt(match[1], 10),
    extractTitle: (match) => (match[2] || '').trim().slice(0, 40),
  },
]

/** 特殊卷首/卷尾：无序号，按出现顺序插入 */
const SPECIAL_HEADINGS: Array<{ regex: RegExp; title: string }> = [
  { regex: new RegExp(`${LINE_START}(?:楔子|引子|序章|序言|前言|开篇|开场)(?=$|[\\s：:\\-—–])`, 'gm'), title: '楔子' },
  { regex: new RegExp(`${LINE_START}(?:尾声|终章|后记|结语|大结局)(?=$|[\\s：:\\-—–])`, 'gm'), title: '尾声' },
  { regex: new RegExp(`${LINE_START}番外[ \\t　]*[：:\\-—–]?[ \\t　]*(.*)`, 'gm'), title: '番外' },
]

function scorePattern(matches: EpisodeMarkerMatch[], priority: number): number {
  if (matches.length < 2) return -1

  const numbers = matches.map((m) => m.episodeNumber).filter((n) => Number.isFinite(n) && n > 0)
  if (numbers.length < 2) return -1

  // 大致递增则加分
  let increasing = 0
  for (let i = 1; i < numbers.length; i++) {
    if (numbers[i] >= numbers[i - 1]) increasing++
  }
  const seqRatio = increasing / (numbers.length - 1)

  // 去重后数量
  const unique = new Set(numbers).size
  const uniqueRatio = unique / numbers.length

  return priority * 10 + matches.length * seqRatio * uniqueRatio
}

function extractChapterName(match: EpisodeMarkerMatch): string {
  const raw = (match.titleHint || '').trim() || match.text.trim()
  const cleaned = raw
    .replace(/^[\s#＃【\[《「『（(]+/, '')
    .replace(/[】\]》」』）)]+$/u, '')
    .replace(/^第[零〇一二三四五六七八九十百千万壹贰叁肆伍陆柒捌玖拾佰仟两\d\s　]+[章节回话剧集幕篇]\s*/u, '')
    .replace(/^(?:Chapter|Episode|Act)\s*\d+\s*/i, '')
    .replace(/^\d{1,4}[\.、：:]\s*/, '')
    .replace(/^[\s：:\-—–|｜]+/, '')
    .trim()

  if (cleaned) return cleaned.slice(0, 36)
  if (/楔子|引子|序章|序言|前言|开篇|开场/.test(raw)) return '楔子'
  if (/尾声|终章|后记|结语|大结局/.test(raw)) return '尾声'
  if (/番外/.test(raw)) return '番外'
  return ''
}

function buildEpisodeTitle(match: EpisodeMarkerMatch, displayIndex: number): string {
  const name = extractChapterName(match)
  if (name) return `第 ${displayIndex} 集：${name}`
  return `第 ${displayIndex} 集`
}

function isChapterHeadingLine(line: string): boolean {
  const first = line.trim()
  if (!first) return false
  return (
    /^第[零〇一二三四五六七八九十百千万壹贰叁肆伍陆柒捌玖拾佰仟两\d\s　]+[章节回话剧集幕篇]/.test(first) ||
    /^(?:Chapter|Episode|Act)\s*\d+/i.test(first) ||
    /^(?:楔子|引子|序章|序言|前言|开篇|开场|尾声|终章|后记|结语|大结局|番外)/.test(first) ||
    /^\d{1,4}[\.、：:]\s*\S+/.test(first) ||
    /^【[^】]{1,40}】/.test(first)
  )
}

/**
 * 去掉正文中的章节标题行（标题已写入剧集名）。
 * 兼容章首有书名/来源等元数据：在前几行非空行中查找并删除首个章节标题。
 */
export function stripLeadingChapterHeading(content: string): string {
  const normalized = content.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n')
  const lines = normalized.split('\n')
  if (!lines.length) return ''

  let nonEmptySeen = 0
  let headingIdx = -1
  for (let i = 0; i < lines.length && nonEmptySeen < 12; i++) {
    if (!lines[i].trim()) continue
    nonEmptySeen++
    if (isChapterHeadingLine(lines[i])) {
      headingIdx = i
      break
    }
  }

  if (headingIdx >= 0) {
    lines.splice(headingIdx, 1)
  }

  while (lines.length && !lines[0].trim()) lines.shift()
  while (lines.length && !lines[lines.length - 1].trim()) lines.pop()
  return lines.join('\n').trim()
}

function buildPreviewSplits(content: string, matches: EpisodeMarkerMatch[]): PreviewSplit[] {
  const sorted = [...matches].sort((a, b) => a.index - b.index)
  const previewSplits: PreviewSplit[] = []

  const firstMatch = sorted[0]
  if (firstMatch && firstMatch.episodeNumber > 1 && firstMatch.index > 80) {
    const episodeContent = stripLeadingChapterHeading(content.slice(0, firstMatch.index))
    const preview = episodeContent.slice(0, 50).trim().slice(0, 20)
    previewSplits.push({
      number: 1,
      title: '第 1 集：序章',
      wordCount: countWords(episodeContent),
      startIndex: 0,
      endIndex: firstMatch.index,
      preview: preview + (preview.length >= 20 ? '...' : ''),
    })
  }

  sorted.forEach((match, idx) => {
    const actualStart = idx === 0 && previewSplits.length > 0 ? match.index : idx === 0 ? 0 : match.index
    const endIndex = idx < sorted.length - 1 ? sorted[idx + 1].index : content.length
    const rawSlice = content.slice(actualStart, endIndex)
    const episodeContent = stripLeadingChapterHeading(rawSlice)
    const displayIndex = previewSplits.length + 1
    const title = buildEpisodeTitle(match, displayIndex)
    const preview = episodeContent.slice(0, 50).trim().slice(0, 20)

    previewSplits.push({
      number: displayIndex,
      title,
      wordCount: countWords(episodeContent),
      startIndex: actualStart,
      endIndex,
      preview: preview + (preview.length >= 20 ? '...' : ''),
    })
  })

  return previewSplits.map((split, i) => ({
    ...split,
    number: i + 1,
    title: split.title.replace(/^第\s*\d+\s*集/, `第 ${i + 1} 集`),
  }))
}

/**
 * 检测文本中的章节 / 分集标记
 */
export function detectEpisodeMarkers(content: string): EpisodeMarkerResult {
  const result: EpisodeMarkerResult = {
    hasMarkers: false,
    markerType: '',
    markerTypeKey: '',
    confidence: 'low',
    matches: [],
    previewSplits: [],
  }

  if (!content || content.length < 80) {
    return result
  }

  let bestScore = -1
  let bestMatches: EpisodeMarkerMatch[] = []
  let bestPattern: DetectionPattern | null = null

  for (const pattern of DETECTION_PATTERNS) {
    const regex = new RegExp(pattern.regex.source, pattern.regex.flags)
    const matches: EpisodeMarkerMatch[] = []
    let match: RegExpExecArray | null

    while ((match = regex.exec(content)) !== null) {
      // LINE_START 可能吃掉前导换行，校准到真实标题起点
      const rawIndex = match.index
      const matchedText = match[0]
      const leadingBreak = matchedText.match(/^[\r\n]+/)?.[0].length ?? 0
      const index = rawIndex + leadingBreak
      const text = matchedText.slice(leadingBreak)

      const episodeNumber = pattern.extractNumber(match)
      if (!Number.isFinite(episodeNumber) || episodeNumber <= 0) continue

      if (pattern.typeKey === 'scene') {
        if (matches.some((m) => m.episodeNumber === episodeNumber)) continue
      }

      const titleHint = pattern.extractTitle(match)
      matches.push({ index, text, episodeNumber, titleHint: titleHint || undefined })
    }

    const score = scorePattern(matches, pattern.priority)
    if (score > bestScore) {
      bestScore = score
      bestMatches = matches
      bestPattern = pattern
    }
  }

  if (!bestPattern || bestMatches.length < 2) {
    return result
  }

  bestMatches.sort((a, b) => a.index - b.index)

  // 附加楔子 / 尾声 / 番外（插在合适位置）
  const specials: EpisodeMarkerMatch[] = []
  for (const special of SPECIAL_HEADINGS) {
    const regex = new RegExp(special.regex.source, special.regex.flags)
    let match: RegExpExecArray | null
    while ((match = regex.exec(content)) !== null) {
      const leadingBreak = match[0].match(/^[\r\n]+/)?.[0].length ?? 0
      const index = match.index + leadingBreak
      // 避免与已选章节标题重叠
      if (bestMatches.some((m) => Math.abs(m.index - index) < 8)) continue
      const extra = (match[1] || '').trim()
      specials.push({
        index,
        text: match[0].slice(leadingBreak),
        episodeNumber: 0,
        titleHint: extra ? `${special.title} ${extra}`.trim() : special.title,
      })
    }
  }

  const merged = [...bestMatches, ...specials].sort((a, b) => a.index - b.index)

  result.hasMarkers = true
  result.matches = merged
  result.markerType = bestPattern.typeName
  result.markerTypeKey = bestPattern.typeKey

  const matchCount = bestMatches.length
  const span = bestMatches[bestMatches.length - 1].index - bestMatches[0].index
  const avgDistance = matchCount > 1 ? span / (matchCount - 1) : 0

  if (bestPattern.priority >= 85 && matchCount >= 3 && avgDistance >= 200) {
    result.confidence = 'high'
  } else if (matchCount >= 2) {
    result.confidence = 'medium'
  } else {
    result.confidence = 'low'
  }

  result.previewSplits = buildPreviewSplits(content, merged)
  return result
}

/**
 * 根据检测结果分割内容
 */
export function splitByMarkers(
  content: string,
  markerResult: EpisodeMarkerResult,
): Array<{
  number: number
  title: string
  summary: string
  content: string
  wordCount: number
}> {
  if (!markerResult.hasMarkers || markerResult.previewSplits.length === 0) {
    return []
  }

  return markerResult.previewSplits.map((split) => {
    const episodeContent = stripLeadingChapterHeading(
      content.slice(split.startIndex, split.endIndex),
    )
    return {
      number: split.number,
      title: split.title || `第 ${split.number} 集`,
      summary: '',
      content: episodeContent,
      wordCount: countWords(episodeContent),
    }
  })
}
