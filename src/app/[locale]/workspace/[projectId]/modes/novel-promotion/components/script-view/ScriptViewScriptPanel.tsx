'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type UIEvent } from 'react'
import { logWarn as _ulogWarn } from '@/lib/logging/core'
import { AppIcon } from '@/components/ui/icons'
import {
  SCRIPT_CLIP_PEEK_STRIDE_PX,
  SCRIPT_CLIP_VIRTUAL_THRESHOLD,
  computeVirtualWindow,
  scrollTopToRevealIndex,
  shouldVirtualizeList,
} from '@/lib/ui/virtual-list'
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
  const [scrollTop, setScrollTop] = useState(0)
  const [viewportHeight, setViewportHeight] = useState(0)

  const virtualized = shouldVirtualizeList(clips.length, SCRIPT_CLIP_VIRTUAL_THRESHOLD)
  const selectedIndex = useMemo(
    () => (selectedClipId ? clips.findIndex((clip) => clip.id === selectedClipId) : -1),
    [clips, selectedClipId],
  )

  useEffect(() => {
    const el = listRef.current
    if (!el) return
    const syncViewport = () => setViewportHeight(el.clientHeight)
    syncViewport()
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(syncViewport) : null
    ro?.observe(el)
    return () => ro?.disconnect()
  }, [virtualized, clips.length])

  useEffect(() => {
    const el = listRef.current
    if (!el || selectedIndex < 0) return
    if (virtualized) {
      const next = scrollTopToRevealIndex({
        index: selectedIndex,
        itemSize: SCRIPT_CLIP_PEEK_STRIDE_PX,
        viewportHeight: el.clientHeight,
        scrollTop: el.scrollTop,
        itemCount: clips.length,
      })
      if (next !== el.scrollTop) {
        el.scrollTop = next
        setScrollTop(next)
      }
      return
    }
    const node = el.querySelector(`[data-clip-id="${selectedClipId}"]`)
    if (node instanceof HTMLElement) {
      node.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [selectedClipId, selectedIndex, virtualized, clips.length])

  const handleListScroll = useCallback((event: UIEvent<HTMLDivElement>) => {
    setScrollTop(event.currentTarget.scrollTop)
  }, [])

  const virtualWindow = useMemo(() => {
    if (!virtualized) {
      return { startIndex: 0, endIndex: clips.length - 1, offsetY: 0, totalHeight: 0 }
    }
    return computeVirtualWindow({
      scrollTop,
      viewportHeight: viewportHeight || 480,
      itemCount: clips.length,
      itemSize: SCRIPT_CLIP_PEEK_STRIDE_PX,
      overscan: 4,
    })
  }, [virtualized, scrollTop, viewportHeight, clips.length])

  const visibleClips = useMemo(() => {
    if (!virtualized || virtualWindow.endIndex < 0) return clips
    return clips.slice(virtualWindow.startIndex, virtualWindow.endIndex + 1)
  }, [clips, virtualized, virtualWindow.startIndex, virtualWindow.endIndex])

  const handleScriptSave = async (clipId: string, newContent: string, isJson: boolean) => {
    if (!onClipUpdate) return
    const updateData: Partial<Clip> = isJson ? { screenplay: newContent } : { content: newContent }
    await onClipUpdate(clipId, updateData)
  }

  const renderClipRow = (clip: Clip, idx: number) => {
    // Only the selected clip expands full screenplay — keeps large episode lists light.
    const isExpanded = selectedClipId === clip.id
    const isSelected = isExpanded
    const screenplay = isExpanded ? parseScreenplay(clip.screenplay) : null
    const peek = clip.summary || clip.content || ''

    return (
      <div
        key={clip.id}
        data-clip-id={clip.id}
        onClick={() => onSelectClip(clip.id)}
        className={`
          group relative cursor-pointer transition-colors
          ${idx > 0 ? 'mt-4 border-t border-[var(--glass-stroke-base)]/70 pt-4' : ''}
          ${isSelected ? 'pl-3 -ml-1 border-l-2 border-l-[var(--film-gold)]' : 'pl-3 -ml-1 border-l-2 border-l-transparent'}
        `}
      >
        {savingClips.has(clip.id) && (
          <div className="absolute top-0 right-0 text-xs text-[var(--glass-tone-info-fg)] flex items-center gap-1 animate-pulse">
            <AppIcon name="upload" className="w-3 h-3" />
            {t('preview.saving')}
          </div>
        )}

        <div className="flex justify-between mb-2 gap-2">
          <span className="text-xs font-medium text-[var(--film-gold)]">
            {tScript('segment.title', { index: idx + 1 })}
            {isSelected ? ` ${tScript('segment.selected')}` : ''}
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
          <div className="space-y-4">
            {screenplay.scenes.map((scene, sceneIdx: number) => (
              <div key={sceneIdx} className="space-y-2.5">
                <div className="flex items-center gap-2 text-xs flex-wrap">
                  <span className="font-semibold tracking-wide text-[var(--film-gold)]">
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

                {scene.description ? (
                  <div className="text-xs leading-relaxed text-[var(--glass-text-secondary)]">
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
                ) : null}

                <div className="flex flex-col gap-2.5">
                  {scene.content?.map((item, itemIdx: number) => {
                    if (item.type === 'action') {
                      return (
                        <div
                          key={itemIdx}
                          className="flex items-start gap-2 text-sm leading-relaxed text-[var(--glass-text-secondary)]"
                        >
                          <AppIcon name="clapperboard" className="w-3.5 h-3.5 text-[var(--glass-text-tertiary)] shrink-0 mt-[3px]" />
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
                          <span className="text-[length:var(--glass-font-size-body)] font-semibold text-[var(--film-gold)] shrink-0">
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
                          <span className="text-[length:var(--glass-font-size-body)] font-semibold italic text-[var(--glass-text-tertiary)] shrink-0">
                            {tScript('screenplay.narration')}
                          </span>
                          <p className="text-[length:var(--glass-font-size-title)] text-[var(--glass-text-secondary)] font-medium italic leading-[1.5] flex-1">
                            {item.text}
                          </p>
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
  }

  return (
    <div className="col-span-12 lg:col-span-9 flex flex-col min-h-0 lg:h-full gap-3">
      <div className="flex shrink-0 justify-between items-end px-2">
        <h2 className="text-xl font-medium text-[var(--glass-text-primary)] flex items-center gap-2">
          <span className="w-1.5 h-6 bg-[var(--glass-accent-from)] rounded-full" /> {tScript('scriptBreakdown')}
        </h2>
        <span className="text-sm text-[var(--glass-text-tertiary)]">
          {tScript('splitCount', { count: clips.length })}
        </span>
      </div>

      <div className="shrink-0">
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
      </div>

      <div className="relative flex w-full min-h-0 flex-1 flex-col overflow-hidden rounded-[var(--glass-radius-panel)] bg-[var(--film-well-bg)]">
        <div
          ref={listRef}
          className="absolute inset-0 overflow-y-auto px-5 py-4 sm:px-6 sm:py-5 app-scrollbar"
          onScroll={virtualized ? handleListScroll : undefined}
          data-virtualized={virtualized ? 'true' : undefined}
        >
          {clips.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-[var(--glass-text-tertiary)]">
              <AppIcon name="fileFold" className="h-10 w-10 mb-2" />
              <p>{tScript('noClips')}</p>
            </div>
          ) : virtualized ? (
            <div
              style={{
                paddingTop: virtualWindow.offsetY,
                paddingBottom: Math.max(
                  0,
                  (clips.length - virtualWindow.endIndex - 1) * SCRIPT_CLIP_PEEK_STRIDE_PX,
                ),
              }}
            >
              {visibleClips.map((clip, i) =>
                renderClipRow(clip, virtualWindow.startIndex + i),
              )}
            </div>
          ) : (
            clips.map((clip, idx) => renderClipRow(clip, idx))
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
