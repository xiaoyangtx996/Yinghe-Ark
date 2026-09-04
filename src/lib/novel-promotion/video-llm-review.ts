/**
 * Video LLM auto-review (P4.3).
 * Text-only motion/continuity rubric — does not block batch generate.
 */

import {
  listVideoReviewGateIds,
  type VideoReviewGateId,
  type VideoReviewPanelInput,
} from '@/lib/novel-promotion/video-review-gates'

export type VideoLlmFindingSeverity = 'info' | 'warn'

export type VideoLlmFinding = {
  gateId: VideoReviewGateId | null
  severity: VideoLlmFindingSeverity
  title: string
  detail: string
  panelIds: string[]
}

export type VideoLlmPanelPayload = {
  id: string
  index: number
  hasImage: boolean
  hasVideo: boolean
  videoPrompt: string
  hasError: boolean
  errorHint: string
}

const PROMPT_MAX = 400
const PANEL_MAX = 48
const ERROR_MAX = 120

const GATE_RUBRIC: Record<VideoReviewGateId, { label: string; tip: string }> = {
  motion_from_frame: {
    label: '运动是从静帧出发吗？',
    tip: '别另起一套造型；应接着分镜画面动起来',
  },
  action_small_clear: {
    label: '动作短而清楚吗？',
    tip: '一次少做几件事，表演变化要看得出原因',
  },
  no_new_story: {
    label: '有没有凭空加剧情？',
    tip: '别擅自加抓取、换关系、新台词',
  },
  dialogue_match: {
    label: '对白归属对吗？',
    tip: '说话人、口型需求与内心独白别混',
  },
  cut_continuity: {
    label: '相邻成片衔接顺吗？',
    tip: '朝向、手中道具、情绪别无故硬切',
  },
  prompt_focused: {
    label: '提示词在说「怎么动」吗？',
    tip: '别把整本人物设定再贴一遍',
  },
  audio_intent: {
    label: '音效/配音意图清楚吗？',
    tip: '需要配音或口型时，先确认音频就绪',
  },
  playback_ready: {
    label: '关键镜头能连播了吗？',
    tip: '失败的已重试，再考虑导出/进编辑',
  },
}

function truncate(text: string, max: number): string {
  const trimmed = text.trim()
  if (trimmed.length <= max) return trimmed
  return `${trimmed.slice(0, max)}…`
}

function panelKey(panel: VideoReviewPanelInput, index: number): string {
  const id = typeof panel.panelId === 'string' ? panel.panelId.trim() : ''
  return id || `panel_${index}`
}

export function buildVideoLlmReviewPanelPayload(
  panels: readonly VideoReviewPanelInput[],
): VideoLlmPanelPayload[] {
  return panels.slice(0, PANEL_MAX).map((panel, index) => {
    const error = String(panel.videoErrorMessage || '').trim()
    return {
      id: panelKey(panel, index),
      index: index + 1,
      hasImage: Boolean(String(panel.imageUrl || '').trim()),
      hasVideo: Boolean(String(panel.videoUrl || '').trim()),
      videoPrompt: truncate(String(panel.videoPrompt || ''), PROMPT_MAX),
      hasError: error.length > 0,
      errorHint: error ? truncate(error, ERROR_MAX) : '',
    }
  })
}

export function buildVideoLlmReviewSystemPrompt(): string {
  const gateLines = listVideoReviewGateIds()
    .map((id) => {
      const rubric = GATE_RUBRIC[id]
      return `- ${id}: ${rubric.label}（${rubric.tip}）`
    })
    .join('\n')

  return [
    '你是短剧视频镜头编辑助手。根据用户提供的镜头元数据，对照审查维度给出白话问题。',
    '只报告真实存在的问题；没有问题就返回空 findings。',
    '不要编造 panel id；panelIds 只能使用用户给出的 id。',
    '你看不到真实视频/图片；只根据 videoPrompt、hasImage、hasVideo、hasError 判断。',
    'gateId 只能使用下列 id 之一，无法对应时用 null：',
    gateLines,
    '严格输出 JSON（不要 markdown 代码块），格式：',
    '{"findings":[{"gateId":"motion_from_frame"|...|null,"severity":"info"|"warn","title":"短标题","detail":"一句白话说明","panelIds":["panel-id"]}]}',
  ].join('\n')
}

export function buildVideoLlmReviewUserPrompt(
  panels: readonly VideoReviewPanelInput[],
): string {
  const payload = buildVideoLlmReviewPanelPayload(panels)
  return [
    '请审查以下视频镜头（按顺序）：',
    JSON.stringify({ panels: payload }, null, 2),
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

export function parseVideoLlmReviewResponse(raw: string): VideoLlmFinding[] {
  const parsed = extractJsonObject(raw)
  if (!parsed || typeof parsed !== 'object') return []

  const findingsRaw = (parsed as { findings?: unknown }).findings
  if (!Array.isArray(findingsRaw)) return []

  const allowedGates = new Set(listVideoReviewGateIds())
  const findings: VideoLlmFinding[] = []

  for (const item of findingsRaw) {
    if (!item || typeof item !== 'object') continue
    const row = item as Record<string, unknown>
    const title = asString(row.title)
    const detail = asString(row.detail)
    if (!title && !detail) continue

    const severityRaw = asString(row.severity)
    const severity: VideoLlmFindingSeverity = severityRaw === 'warn' ? 'warn' : 'info'

    const gateRaw = asString(row.gateId)
    const gateId =
      gateRaw && allowedGates.has(gateRaw as VideoReviewGateId)
        ? (gateRaw as VideoReviewGateId)
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
