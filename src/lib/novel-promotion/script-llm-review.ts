/**
 * Script LLM auto-review (P4.1).
 * Distills drama-skills review rubric into a sync JSON findings call — does not block generate.
 */

import {
  listScriptReviewGateIds,
  type ScriptReviewClipInput,
  type ScriptReviewGateId,
} from '@/lib/novel-promotion/script-review-gates'
import { parseClipCharacterNames, parseClipLocationLabel } from '@/lib/novel-promotion/clip-event-graph'

export type ScriptLlmFindingSeverity = 'info' | 'warn'

export type ScriptLlmFinding = {
  gateId: ScriptReviewGateId | null
  severity: ScriptLlmFindingSeverity
  title: string
  detail: string
  clipIds: string[]
}

export type ScriptLlmReviewClipPayload = {
  id: string
  index: number
  summary: string
  content: string
  characters: string[]
  location: string | null
}

const CONTENT_MAX = 800

const GATE_RUBRIC: Record<ScriptReviewGateId, { label: string; tip: string }> = {
  opening_pressure: {
    label: '开场有压力吗？',
    tip: '一上来观众能否感到「有事要崩」或「有东西要守」',
  },
  want_vs_block: {
    label: '主角要什么、谁在挡？',
    tip: '本集欲望要具体；阻力也要看得见，别只写气氛',
  },
  turn_choice: {
    label: '转折是主角选的吗？',
    tip: '重大转向最好由主角选择造成；纯救援/巧合会显得被动',
  },
  local_payoff: {
    label: '本集有没有小回报？',
    tip: '至少给观众一个「这集没白看」的兑现或反转',
  },
  next_state: {
    label: '下场状态变了吗？',
    tip: '结束时应有新压力/新信息，而不是回到开场同一局面',
  },
  scene_change: {
    label: '片段之间有变化吗？',
    tip: '相邻片段应在目标、阻力或信息上推进，避免重复气氛',
  },
  dialogue_want: {
    label: '对白有意图吗？',
    tip: '每句对白最好在要东西、挡东西或藏东西，而非纯聊天',
  },
  turn_setup: {
    label: '转折有铺垫吗？',
    tip: '大转折前应有可回看的伏笔，别凭空变卦',
  },
}

function truncate(text: string, max: number): string {
  const trimmed = text.trim()
  if (trimmed.length <= max) return trimmed
  return `${trimmed.slice(0, max)}…`
}

export function buildScriptLlmReviewClipPayload(
  clips: readonly ScriptReviewClipInput[],
): ScriptLlmReviewClipPayload[] {
  return clips.map((clip, index) => ({
    id: clip.id,
    index: index + 1,
    summary: truncate(String(clip.summary || ''), 160),
    content: truncate(String(clip.content || ''), CONTENT_MAX),
    characters: parseClipCharacterNames(clip.characters),
    location: parseClipLocationLabel(clip.location),
  }))
}

export function buildScriptLlmReviewSystemPrompt(): string {
  const gateLines = listScriptReviewGateIds()
    .map((id) => {
      const rubric = GATE_RUBRIC[id]
      return `- ${id}: ${rubric.label}（${rubric.tip}）`
    })
    .join('\n')

  return [
    '你是短剧剧本编辑助手。根据用户提供的剧情片段，对照审查维度给出白话问题列表。',
    '只报告真实存在的问题；没有问题就返回空 findings。',
    '不要编造片段 id；clipIds 只能使用用户给出的 id。',
    'gateId 只能使用下列 id 之一，无法对应时用 null：',
    gateLines,
    '严格输出 JSON（不要 markdown 代码块），格式：',
    '{"findings":[{"gateId":"opening_pressure"|"want_vs_block"|...|null,"severity":"info"|"warn","title":"短标题","detail":"一句白话说明","clipIds":["clip-id"]}]}',
  ].join('\n')
}

export function buildScriptLlmReviewUserPrompt(
  clips: readonly ScriptReviewClipInput[],
): string {
  const payload = buildScriptLlmReviewClipPayload(clips)
  return [
    '请审查以下剧情片段（按播放顺序）：',
    JSON.stringify({ clips: payload }, null, 2),
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

/** Parse model text into findings; drop invalid rows. */
export function parseScriptLlmReviewResponse(raw: string): ScriptLlmFinding[] {
  const parsed = extractJsonObject(raw)
  if (!parsed || typeof parsed !== 'object') return []

  const findingsRaw = (parsed as { findings?: unknown }).findings
  if (!Array.isArray(findingsRaw)) return []

  const allowedGates = new Set(listScriptReviewGateIds())
  const findings: ScriptLlmFinding[] = []

  for (const item of findingsRaw) {
    if (!item || typeof item !== 'object') continue
    const row = item as Record<string, unknown>
    const title = asString(row.title)
    const detail = asString(row.detail)
    if (!title && !detail) continue

    const severityRaw = asString(row.severity)
    const severity: ScriptLlmFindingSeverity = severityRaw === 'warn' ? 'warn' : 'info'

    const gateRaw = asString(row.gateId)
    const gateId =
      gateRaw && allowedGates.has(gateRaw as ScriptReviewGateId)
        ? (gateRaw as ScriptReviewGateId)
        : null

    const clipIds = Array.isArray(row.clipIds)
      ? row.clipIds.filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
          .map((id) => id.trim())
      : []

    findings.push({
      gateId,
      severity,
      title: title || detail.slice(0, 40),
      detail: detail || title,
      clipIds,
    })
  }

  return findings
}
