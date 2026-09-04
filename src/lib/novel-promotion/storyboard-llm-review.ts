/**
 * Storyboard LLM auto-review (P4.2).
 * Text-only panel rubric review — does not block video generation.
 */

import {
  listStoryboardReviewGateIds,
  type StoryboardReviewBoardInput,
  type StoryboardReviewGateId,
  type StoryboardReviewPanelInput,
} from '@/lib/novel-promotion/storyboard-review-gates'

export type StoryboardLlmFindingSeverity = 'info' | 'warn'

export type StoryboardLlmFinding = {
  gateId: StoryboardReviewGateId | null
  severity: StoryboardLlmFindingSeverity
  title: string
  detail: string
  panelIds: string[]
}

export type StoryboardLlmPanelPayload = {
  id: string
  boardId: string
  index: number
  description: string
  imagePrompt: string
  hasImage: boolean
  characters: string
  location: string | null
}

const TEXT_MAX = 320
const PANEL_MAX = 48

const GATE_RUBRIC: Record<StoryboardReviewGateId, { label: string; tip: string }> = {
  shot_purpose: {
    label: '这一镜结束时多了什么？',
    tip: '观众是否多知道一点、压力或关系是否变一点；别只为了好看',
  },
  covers_action: {
    label: '动作/对白/反应盖住了吗？',
    tip: '源里的关键动作与人物反应别丢；有说话也要有听者反应',
  },
  still_keyframe: {
    label: '画面是一瞬间能站住吗？',
    tip: '描述里避免「先…再…最后…」；静帧应是一个可定格的瞬间',
  },
  continuity: {
    label: '相邻镜头连贯吗？',
    tip: '朝向、手中道具、伤情/情绪别无故跳变',
  },
  shot_variety: {
    label: '镜头有变化吗？',
    tip: '别每个情绪都用同一种特写+推进',
  },
  asset_bound: {
    label: '人物/场景绑到资产了吗？',
    tip: '避免匿名路人；关键角色应对上资产库形象',
  },
  no_invented_fact: {
    label: '有没有凭空加剧情？',
    tip: '镜头别擅自加抓伤、换关系、新台词',
  },
  images_ready: {
    label: '关键镜头图齐了再出视频？',
    tip: '先核对图与描述，再点生成视频更省返工',
  },
}

function truncate(text: string, max: number): string {
  const trimmed = text.trim()
  if (trimmed.length <= max) return trimmed
  return `${trimmed.slice(0, max)}…`
}

function flattenPanels(
  storyboards: readonly StoryboardReviewBoardInput[],
): Array<StoryboardReviewPanelInput & { boardId: string }> {
  const panels: Array<StoryboardReviewPanelInput & { boardId: string }> = []
  for (const board of storyboards) {
    if (!Array.isArray(board.panels)) continue
    for (const panel of board.panels) {
      if (panel?.id) panels.push({ ...panel, boardId: board.id })
    }
  }
  return panels
}

export function buildStoryboardLlmReviewPanelPayload(
  storyboards: readonly StoryboardReviewBoardInput[],
): StoryboardLlmPanelPayload[] {
  return flattenPanels(storyboards)
    .slice(0, PANEL_MAX)
    .map((panel, index) => ({
      id: panel.id,
      boardId: panel.boardId,
      index: index + 1,
      description: truncate(String(panel.description || ''), TEXT_MAX),
      imagePrompt: truncate(String(panel.imagePrompt || ''), TEXT_MAX),
      hasImage: Boolean(String(panel.imageUrl || '').trim()),
      characters: truncate(String(panel.characters || ''), 120),
      location: panel.location ? truncate(String(panel.location), 80) : null,
    }))
}

export function buildStoryboardLlmReviewSystemPrompt(): string {
  const gateLines = listStoryboardReviewGateIds()
    .map((id) => {
      const rubric = GATE_RUBRIC[id]
      return `- ${id}: ${rubric.label}（${rubric.tip}）`
    })
    .join('\n')

  return [
    '你是短剧分镜编辑助手。根据用户提供的镜头列表，对照审查维度给出白话问题。',
    '只报告真实存在的问题；没有问题就返回空 findings。',
    '不要编造 panel id；panelIds 只能使用用户给出的 id。',
    '不要假设你看见了真实图片；只根据描述、提示词与 hasImage 判断。',
    'gateId 只能使用下列 id 之一，无法对应时用 null：',
    gateLines,
    '严格输出 JSON（不要 markdown 代码块），格式：',
    '{"findings":[{"gateId":"shot_purpose"|...|null,"severity":"info"|"warn","title":"短标题","detail":"一句白话说明","panelIds":["panel-id"]}]}',
  ].join('\n')
}

export function buildStoryboardLlmReviewUserPrompt(
  storyboards: readonly StoryboardReviewBoardInput[],
): string {
  const panels = buildStoryboardLlmReviewPanelPayload(storyboards)
  return [
    '请审查以下分镜镜头（按顺序）：',
    JSON.stringify({ panels }, null, 2),
  ].join('\n')
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function extractJsonObject(raw: string): unknown {
  const trimmed = raw.trim()
  if (!trimmed) return null
  try {
    return JSON.parse(trimmed)
  } catch {
    const start = trimmed.indexOf('{')
    const end = trimmed.lastIndexOf('}')
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(trimmed.slice(start, end + 1))
      } catch {
        return null
      }
    }
    return null
  }
}

export function parseStoryboardLlmReviewResponse(raw: string): StoryboardLlmFinding[] {
  const parsed = extractJsonObject(raw)
  if (!parsed || typeof parsed !== 'object') return []

  const findingsRaw = (parsed as { findings?: unknown }).findings
  if (!Array.isArray(findingsRaw)) return []

  const allowedGates = new Set(listStoryboardReviewGateIds())
  const findings: StoryboardLlmFinding[] = []

  for (const item of findingsRaw) {
    if (!item || typeof item !== 'object') continue
    const row = item as Record<string, unknown>
    const title = asString(row.title)
    const detail = asString(row.detail)
    if (!title && !detail) continue

    const severityRaw = asString(row.severity)
    const severity: StoryboardLlmFindingSeverity = severityRaw === 'warn' ? 'warn' : 'info'

    const gateRaw = asString(row.gateId)
    const gateId =
      gateRaw && allowedGates.has(gateRaw as StoryboardReviewGateId)
        ? (gateRaw as StoryboardReviewGateId)
        : null

    const panelIds = Array.isArray(row.panelIds)
      ? row.panelIds
          .filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
          .map((id) => id.trim())
      : []

    findings.push({
      gateId,
      severity,
      title: title || detail.slice(0, 40),
      detail: detail || title,
      panelIds,
    })
  }

  return findings
}
