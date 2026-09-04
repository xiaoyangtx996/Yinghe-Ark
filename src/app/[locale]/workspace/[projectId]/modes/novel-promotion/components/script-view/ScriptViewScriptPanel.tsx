'use client'

import { useEffect, useRef, useState } from 'react'
import { logWarn as _ulogWarn } from '@/lib/logging/core'
import { AppIcon } from '@/components/ui/icons'
import ClipEventGraph from './ClipEventGraph'
import ScriptReviewChecklist from './ScriptReviewChecklist'

interface Clip {
  id: string
  clipIndex?: number
  summary: string
  content: string
  screenplay?: string | null
  characters: string | null
  location: string | null
}

type ScreenplayContentItem =
  | { type: 'action'; text: string }
  | { type: 'dialogue'; character: string; lines: string }
  | { type: 'voiceover'; text: string }

interface ScreenplayScene {
  scene_number?: number
  heading?: {
    int_ext?: string
    location?: string
    time?: string
  }
  description?: string
  content?: ScreenplayContentItem[]
}

interface ScreenplayData {
  scenes: ScreenplayScene[]
}

function parseScreenplay(value: string | null | undefined): ScreenplayData | null {
  if (!value) return null
  try {
    const parsed = JSON.parse(value)
    if (!parsed || typeof parsed !== 'object') return null
    const scenes = (parsed as { scenes?: unknown }).scenes
    if (!Array.isArray(scenes)) return null
    return parsed as ScreenplayData
  } catch (error) {
    _ulogWarn('解析剧本JSON失败:', error)
    return null
  }
}

interface ScriptViewScriptPanelProps {
  projectId: string
  episodeId?: string
  clips: Clip[]
  selectedClipId: string | null
  onSelectClip: (clipId: string) => void
  onMoveClip?: (clipId: string, direction: 'up' | 'down') => void
  onDragReorderClip?: (clipId: string, overClipId: string) => void
  onMergeWithNext?: (clipId: string) => void
  movingClipId?: string | null
  mergingClipId?: string | null
  savingClips: Set<string>
  onClipEdit?: (clipId: string) => void
  onClipDelete?: (clipId: string) => void
  onClipUpdate?: (clipId: string, data: Partial<Clip>) => void
  t: (key: string, values?: Record<string, unknown>) => string
  tScript: (key: string, values?: Record<string, unknown>) => string
}

function EditableText({
  text,
  onSave,
  className = '',
  tScript,
}: {
  text: string
  onSave: (val: string) => void
  className?: string
  tScript: (key: string, values?: Record<string, unknown>) => string
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [value, setValue] = useState(text)

  useEffect(() => {
    setValue(text)
  }, [text])

  const handleBlur = () => {
    setIsEditing(false)
    if (value !== text) {
      onSave(value)
    }
  }

  if (isEditing) {
    return (
      <textarea
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleBlur}
        className={`w-full bg-[var(--glass-bg-surface)] border border-[var(--glass-stroke-focus)] rounded p-1 outline-none focus:ring-2 focus:ring-[var(--glass-focus-ring-strong)] ${className}`}
        style={{ resize: 'none', minHeight: '1.5em' }}
      />
    )
  }

  return (
    <div
      onClick={(e) => {
        e.stopPropagation()
        setIsEditing(true)
      }}
      className={`cursor-text hover:bg-[var(--glass-tone-info-bg)] rounded px-1 -mx-1 transition-colors border border-transparent hover:border-[var(--glass-stroke-focus)] ${className}`}
      title={tScript('screenplay.clickToEdit')}
    >
      {text}
    </div>
  )
}

export default function ScriptViewScriptPanel({
  projectId,
  episodeId,
  clips,
  selectedClipId,
  onSelectClip,
  onMoveClip,
  onDragReorderClip,
  onMergeWithNext,
  movingClipId = null,
  mergingClipId = null,
  savingClips,
  onClipEdit,
  onClipDelete,
  onClipUpdate,
  t,
  tScript,
}: ScriptViewScriptPanelProps) {
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!selectedClipId || !listRef.current) return
    const el = listRef.current.querySelector(`[data-clip-id="${selectedClipId}"]`)
    if (el instanceof HTMLElement) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [selectedClipId])

  const handleScriptSave = async (clipId: string, newContent: string, isJson: boolean) => {
    if (!onClipUpdate) return
    const updateData: Partial<Clip> = isJson ? { screenplay: newContent } : { content: newContent }
    await onClipUpdate(clipId, updateData)
  }

  return (
    <div className="col-span-12 lg:col-span-9 flex flex-col min-h-[400px] lg:h-full gap-4">
      <div className="flex justify-between items-end px-2">
        <h2 className="text-xl font-medium text-[var(--glass-text-primary)] flex items-center gap-2">
          <span className="w-1.5 h-6 bg-[var(--glass-accent-from)] rounded-full" /> {tScript('scriptBreakdown')}
        </h2>
        <span className="text-sm text-[var(--glass-text-tertiary)]">
          {tScript('splitCount', { count: clips.length })}
        </span>
      </div>

      <ClipEventGraph
        clips={clips}
        selectedClipId={selectedClipId}
        onSelectClip={onSelectClip}
        onMoveClip={onMoveClip}
        onDragReorderClip={onDragReorderClip}
        onMergeWithNext={onMergeWithNext}
        movingClipId={movingClipId}
        mergingClipId={mergingClipId}
      />

      <div className="flex-1 glass-inset overflow-hidden flex flex-col relative w-full min-h-[300px]">
        <div ref={listRef} className="lg:absolute lg:inset-0 overflow-y-auto p-4 sm:p-6 space-y-3 app-scrollbar">
          {clips.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-[var(--glass-text-tertiary)]">
              <AppIcon name="fileFold" className="h-10 w-10 mb-2" />
              <p>{tScript('noClips')}</p>
            </div>
          ) : (
            clips.map((clip, idx) => {
              const screenplay = parseScreenplay(clip.screenplay)
              const isExpanded = !selectedClipId || selectedClipId === clip.id
              const peek = clip.summary || clip.content || ''

              return (
                <div
                  key={clip.id}
                  data-clip-id={clip.id}
                  onClick={() => onSelectClip(clip.id)}
                  className={`
                    group border-[1.5px] rounded-2xl transition-all cursor-pointer relative bg-[var(--glass-bg-surface)]
                    ${isExpanded ? 'p-5' : 'px-4 py-3'}
                    ${selectedClipId === clip.id
                      ? 'border-[var(--glass-stroke-focus)] shadow-[var(--glass-shadow-md)] ring-2 ring-[var(--glass-focus-ring-strong)]'
                      : 'border-[var(--glass-stroke-base)] hover:border-[var(--glass-stroke-focus)]/40 hover:shadow-md'
                    }
                  `}
                >
                  {savingClips.has(clip.id) && (
                    <div className="absolute top-2 right-2 text-xs text-[var(--glass-tone-info-fg)] flex items-center gap-1 animate-pulse">
                      <AppIcon name="upload" className="w-3 h-3" />
                      {t('preview.saving')}
                    </div>
                  )}

                  <div className="flex justify-between mb-1 gap-2">
                    <span className="text-xs font-medium px-2 py-0.5 rounded text-[var(--glass-tone-info-fg)] bg-[var(--glass-tone-info-bg)]">
                      {tScript('segment.title', { index: idx + 1 })} {selectedClipId === clip.id && tScript('segment.selected')}
                    </span>
                    {isExpanded ? (
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {onClipEdit && (
                          <button
                            onClick={(e) => { e.stopPropagation(); onClipEdit(clip.id) }}
                            className="text-[var(--glass-text-tertiary)] text-xs cursor-pointer hover:text-[var(--glass-tone-info-fg)]"
                          >
                            {t('common.edit')}
                          </button>
                        )}
                        {onClipDelete && (
                          <button
                            onClick={(e) => { e.stopPropagation(); onClipDelete(clip.id) }}
                            className="text-[var(--glass-text-tertiary)] text-xs cursor-pointer hover:text-[var(--glass-tone-danger-fg)]"
                          >
                            {t('common.delete')}
                          </button>
                        )}
                      </div>
                    ) : (
                      <span className="text-[length:var(--glass-font-size-caption)] text-[var(--glass-text-tertiary)] shrink-0">
                        {tScript('segment.collapsedHint')}
                      </span>
                    )}
                  </div>

                  {!isExpanded ? (
                    <p className="text-sm leading-relaxed text-[var(--glass-text-secondary)] line-clamp-2">
                      {peek || tScript('segment.collapsedHint')}
                    </p>
                  ) : screenplay && screenplay.scenes ? (
                    <div className="space-y-3">
                      {screenplay.scenes.map((scene, sceneIdx: number) => (
                        <div key={sceneIdx}>
                          {/* 场景头信息 */}
                          <div className="flex items-center gap-1.5 text-xs mb-2 flex-wrap">
                            <span className="font-medium text-[var(--glass-tone-info-fg)] bg-[var(--glass-tone-info-bg)] px-2 py-0.5 rounded">
                              {tScript('screenplay.scene', { number: scene.scene_number })}
                            </span>
                            <span className="text-[var(--glass-text-tertiary)] flex items-center gap-1">
                              {scene.heading?.int_ext} ·
                              <EditableText
                                text={scene.heading?.location || ''}
                                onSave={(newVal) => {
                                  const newScreenplay = JSON.parse(JSON.stringify(screenplay))
                                  newScreenplay.scenes[sceneIdx].heading.location = newVal
                                  void handleScriptSave(clip.id, JSON.stringify(newScreenplay), true)
                                }}
                                className="inline"
                                tScript={tScript}
                              />
                              ·
                              <EditableText
                                text={scene.heading?.time || ''}
                                onSave={(newVal) => {
                                  const newScreenplay = JSON.parse(JSON.stringify(screenplay))
                                  newScreenplay.scenes[sceneIdx].heading.time = newVal
                                  void handleScriptSave(clip.id, JSON.stringify(newScreenplay), true)
                                }}
                                className="inline"
                                tScript={tScript}
                              />
                            </span>
                          </div>

                          {/* 场景描述 */}
                          {scene.description && (
                            <div className="text-xs text-[var(--glass-text-secondary)] bg-[var(--glass-bg-muted)] border-l-2 border-[var(--glass-stroke-base)] px-2 py-1 rounded mb-2">
                              <EditableText
                                text={scene.description}
                                onSave={(newVal) => {
                                  const newScreenplay = JSON.parse(JSON.stringify(screenplay))
                                  newScreenplay.scenes[sceneIdx].description = newVal
                                  void handleScriptSave(clip.id, JSON.stringify(newScreenplay), true)
                                }}
                                tScript={tScript}
                              />
                            </div>
                          )}

                          {/* 内容流 - 高密度胶囊文本流 */}
                          <div className="flex flex-col gap-2">
                            {scene.content?.map((item, itemIdx: number) => {
                              if (item.type === 'action') {
                                return (
                                  <div key={itemIdx} className="text-sm text-[var(--glass-text-secondary)] bg-[var(--glass-bg-muted)]/60 border border-[var(--glass-stroke-base)] px-2.5 py-1 rounded-lg flex items-start gap-2 w-fit max-w-full leading-[1.5]">
                                    <AppIcon name="clapperboard" className="w-3.5 h-3.5 text-[var(--glass-text-tertiary)] shrink-0 mt-[2px]" />
                                    <EditableText
                                      text={item.text}
                                      onSave={(newVal) => {
                                        const newScreenplay = JSON.parse(JSON.stringify(screenplay))
                                        newScreenplay.scenes[sceneIdx].content[itemIdx].text = newVal
                                        void handleScriptSave(clip.id, JSON.stringify(newScreenplay), true)
                                      }}
                                      tScript={tScript}
                                    />
                                  </div>
                                )
                              }
                              if (item.type === 'dialogue') {
                                return (
                                  <div key={itemIdx} className="flex flex-wrap items-baseline gap-2">
                                    <span className="inline-flex items-center text-[length:var(--glass-font-size-body)] font-medium text-[var(--glass-tone-info-fg)] bg-[var(--glass-tone-info-bg)] border border-[var(--glass-stroke-focus)]/40 px-2.5 py-0.5 rounded-full shrink-0">
                                      {item.character}
                                    </span>
                                    <div className="text-[length:var(--glass-font-size-title)] text-[var(--glass-text-primary)] font-medium leading-[1.5] flex-1 min-w-0">
                                      <EditableText
                                        text={item.lines}
                                        onSave={(newVal) => {
                                          const newScreenplay = JSON.parse(JSON.stringify(screenplay))
                                          newScreenplay.scenes[sceneIdx].content[itemIdx].lines = newVal
                                          void handleScriptSave(clip.id, JSON.stringify(newScreenplay), true)
                                        }}
                                        tScript={tScript}
                                      />
                                    </div>
                                  </div>
                                )
                              }
                              if (item.type === 'voiceover') {
                                return (
                                  <div key={itemIdx} className="flex flex-wrap items-baseline gap-2">
                                    <span className="inline-flex items-center text-[length:var(--glass-font-size-body)] font-medium text-[var(--glass-tone-info-fg)]/80 bg-[var(--glass-tone-info-bg)]/50 border border-[var(--glass-stroke-focus)]/20 px-2.5 py-0.5 rounded-full shrink-0 italic">
                                      {tScript('screenplay.narration')}
                                    </span>
                                    <p className="text-[length:var(--glass-font-size-title)] text-[var(--glass-text-secondary)] font-medium italic leading-[1.5] flex-1">{item.text}</p>
                                  </div>
                                )
                              }
                              return null
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[var(--glass-text-secondary)] text-sm leading-relaxed">{clip.summary || clip.content}</p>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>

      <ScriptReviewChecklist
        projectId={projectId}
        episodeId={episodeId}
        clips={clips}
      />
    </div>
  )
}
