'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { AppIcon } from '@/components/ui/icons'
import {
  resolveClipEventNodes,
  type ClipEventNode,
  type ClipEventSource,
} from '@/lib/novel-promotion/clip-event-graph'
import {
  applyClipIdOrder,
  canMoveClip,
  resolveClipDragReorder,
  type ClipMoveDirection,
} from '@/lib/novel-promotion/clip-reorder'
import { canMergeWithNext } from '@/lib/novel-promotion/clip-merge'

interface ClipEventGraphProps {
  clips: ClipEventSource[]
  selectedClipId: string | null
  onSelectClip: (clipId: string) => void
  onMoveClip?: (clipId: string, direction: ClipMoveDirection) => void
  onDragReorderClip?: (clipId: string, overClipId: string) => void
  onMergeWithNext?: (clipId: string) => void
  movingClipId?: string | null
  mergingClipId?: string | null
}

function EventNodeCard({
  node,
  selected,
  dimmed,
  grab,
  labels,
  onSelect,
  dragProps,
}: {
  node: ClipEventNode
  selected: boolean
  dimmed?: boolean
  grab?: boolean
  labels: { nodeIndex: string; kind: string }
  onSelect?: () => void
  dragProps?: Record<string, unknown>
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`min-w-[148px] max-w-[180px] rounded-[var(--glass-radius-md)] border px-3 py-2 text-left transition touch-none ${
        selected
          ? 'border-[var(--film-gold)] bg-[var(--glass-tone-info-bg)]'
          : 'border-[var(--glass-stroke-base)] hover:border-[var(--film-gold)]/40'
      } ${dimmed ? 'opacity-40' : ''} ${
        grab ? 'cursor-grab active:cursor-grabbing' : ''
      }`}
      {...dragProps}
    >
      <p className="text-[length:var(--glass-font-size-caption)] text-[var(--glass-text-tertiary)]">{labels.nodeIndex}</p>
      <p className="mt-0.5 truncate text-xs font-medium text-[var(--glass-text-primary)]">
        {node.title}
      </p>
      <span className="glass-chip glass-chip-neutral mt-1 text-[length:var(--glass-font-size-caption)]">{labels.kind}</span>
    </button>
  )
}

function SortableEventNode({
  node,
  selected,
  busy,
  dragDisabled,
  onSelect,
  showArrow,
  labels,
}: {
  node: ClipEventNode
  selected: boolean
  busy: boolean
  dragDisabled: boolean
  onSelect: () => void
  showArrow: boolean
  labels: {
    nodeIndex: string
    kind: string
  }
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: node.id, disabled: dragDisabled })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div className="flex items-center gap-2" style={style} ref={setNodeRef}>
      <EventNodeCard
        node={node}
        selected={selected}
        dimmed={busy || isDragging}
        grab={!dragDisabled}
        labels={labels}
        onSelect={onSelect}
        dragProps={{ ...attributes, ...listeners }}
      />
      {showArrow ? (
        <AppIcon name="arrowRight" className="h-4 w-4 shrink-0 text-[var(--glass-text-tertiary)]" />
      ) : null}
    </div>
  )
}

function propOrderKey(clips: ClipEventSource[]): string {
  return clips.map((clip) => clip.id).join('\0')
}

export default function ClipEventGraph({
  clips,
  selectedClipId,
  onSelectClip,
  onMoveClip,
  onDragReorderClip,
  onMergeWithNext,
  movingClipId = null,
  mergingClipId = null,
}: ClipEventGraphProps) {
  const t = useTranslations('scriptView')
  const [activeId, setActiveId] = useState<string | null>(null)
  const [optimisticOrderIds, setOptimisticOrderIds] = useState<string[] | null>(null)

  const propKey = propOrderKey(clips)
  useEffect(() => {
    setOptimisticOrderIds(null)
  }, [propKey])

  const displayClips = useMemo(() => {
    if (!optimisticOrderIds) return clips
    return applyClipIdOrder(clips, optimisticOrderIds) ?? clips
  }, [clips, optimisticOrderIds])

  const nodes = useMemo(() => resolveClipEventNodes(displayClips), [displayClips])
  const orderedIds = useMemo(() => displayClips.map((clip) => clip.id), [displayClips])
  const selected = nodes.find((node) => node.id === selectedClipId) || nodes[0] || null
  const selectedId = selected?.id || null
  const isBusy = Boolean(movingClipId || mergingClipId)
  const canDrag = Boolean(onDragReorderClip) && nodes.length > 1 && !isBusy
  const canMoveEarlier =
    !!selectedId && !!onMoveClip && canMoveClip(orderedIds, selectedId, 'up') && !isBusy
  const canMoveLater =
    !!selectedId && !!onMoveClip && canMoveClip(orderedIds, selectedId, 'down') && !isBusy
  const canMerge =
    !!selectedId && !!onMergeWithNext && canMergeWithNext(orderedIds, selectedId) && !isBusy

  const activeNode = activeId ? nodes.find((node) => node.id === activeId) || null : null
  const activeIndex = activeId ? orderedIds.indexOf(activeId) : -1

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(String(event.active.id))
  }, [])

  const handleDragCancel = useCallback(() => {
    setActiveId(null)
  }, [])

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveId(null)
      if (!onDragReorderClip || isBusy) return
      const { active, over } = event
      if (!over || active.id === over.id) return
      const clipId = String(active.id)
      const overClipId = String(over.id)
      const drag = resolveClipDragReorder(orderedIds, clipId, overClipId)
      if (drag) setOptimisticOrderIds(drag.nextOrder)
      onDragReorderClip(clipId, overClipId)
      onSelectClip(clipId)
    },
    [isBusy, onDragReorderClip, onSelectClip, orderedIds],
  )

  if (nodes.length === 0) return null

  return (
    <div className="space-y-3 rounded-[var(--glass-radius-panel)] bg-[var(--film-well-bg)] p-3">
      <div className="flex flex-wrap items-center gap-2 px-1">
        <AppIcon name="idea" className="h-3.5 w-3.5 text-[var(--film-gold)]" />
        <p className="text-xs font-medium text-[var(--glass-text-secondary)]">
          {t('eventGraph.title')}
        </p>
        <span className="text-[length:var(--glass-font-size-caption)] text-[var(--glass-text-tertiary)]">
          {t('eventGraph.hint')}
        </span>
        {selectedId && nodes.length > 1 ? (
          <div className="ml-auto flex flex-wrap items-center gap-1">
            {onMoveClip ? (
              <>
                <button
                  type="button"
                  disabled={!canMoveEarlier}
                  onClick={() => onMoveClip(selectedId, 'up')}
                  className="glass-btn-base glass-btn-secondary inline-flex items-center gap-1 rounded-md px-2 py-1 text-[length:var(--glass-font-size-caption)]"
                  title={t('eventGraph.moveEarlier')}
                >
                  <AppIcon name="chevronLeft" className="h-3 w-3" />
                  {t('eventGraph.moveEarlier')}
                </button>
                <button
                  type="button"
                  disabled={!canMoveLater}
                  onClick={() => onMoveClip(selectedId, 'down')}
                  className="glass-btn-base glass-btn-secondary inline-flex items-center gap-1 rounded-md px-2 py-1 text-[length:var(--glass-font-size-caption)]"
                  title={t('eventGraph.moveLater')}
                >
                  {t('eventGraph.moveLater')}
                  <AppIcon name="arrowRight" className="h-3 w-3" />
                </button>
              </>
            ) : null}
            {onMergeWithNext ? (
              <button
                type="button"
                disabled={!canMerge}
                onClick={() => onMergeWithNext(selectedId)}
                className="glass-btn-base glass-btn-secondary inline-flex items-center gap-1 rounded-md px-2 py-1 text-[length:var(--glass-font-size-caption)]"
                title={t('eventGraph.mergeWithNext')}
              >
                {mergingClipId === selectedId ? t('eventGraph.merging') : t('eventGraph.mergeWithNext')}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragCancel={handleDragCancel}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={orderedIds} strategy={horizontalListSortingStrategy}>
          <div className="flex items-stretch gap-2 overflow-x-auto pb-1 app-scrollbar">
            {nodes.map((node, index) => (
              <SortableEventNode
                key={node.id}
                node={node}
                selected={selected?.id === node.id}
                busy={movingClipId === node.id}
                dragDisabled={!canDrag}
                onSelect={() => onSelectClip(node.id)}
                showArrow={index < nodes.length - 1}
                labels={{
                  nodeIndex: t('eventGraph.nodeIndex', { index: index + 1 }),
                  kind: t(`eventGraph.kind.${node.kind}`),
                }}
              />
            ))}
          </div>
        </SortableContext>
        <DragOverlay dropAnimation={null}>
          {activeNode ? (
            <div className="flex items-center gap-2 opacity-95 shadow-lg">
              <EventNodeCard
                node={activeNode}
                selected={selected?.id === activeNode.id}
                grab
                labels={{
                  nodeIndex: t('eventGraph.nodeIndex', {
                    index: activeIndex >= 0 ? activeIndex + 1 : 1,
                  }),
                  kind: t(`eventGraph.kind.${activeNode.kind}`),
                }}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {selected ? (
        <div className="rounded-[var(--glass-radius-md)] border border-[var(--glass-stroke-base)] bg-[var(--glass-bg-muted)] px-3 py-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium text-[var(--glass-text-primary)]">
              {selected.title}
            </p>
            <span className="glass-chip glass-chip-info text-[length:var(--glass-font-size-caption)]">
              {t(`eventGraph.kind.${selected.kind}`)}
            </span>
          </div>
          {selected.summary ? (
            <p className="mt-1.5 line-clamp-3 text-xs leading-relaxed text-[var(--glass-text-secondary)]">
              {selected.summary}
            </p>
          ) : null}
          <div className="mt-2 flex flex-wrap gap-1.5">
            {selected.location ? (
              <span className="glass-chip glass-chip-neutral text-[length:var(--glass-font-size-caption)]">
                {t('eventGraph.location', { name: selected.location })}
              </span>
            ) : null}
            {selected.characters.map((name) => (
              <span key={name} className="glass-chip glass-chip-neutral text-[length:var(--glass-font-size-caption)]">
                {name}
              </span>
            ))}
            {selected.characters.length === 0 && !selected.location ? (
              <span className="text-[length:var(--glass-font-size-caption)] text-[var(--glass-text-tertiary)]">
                {t('eventGraph.noMeta')}
              </span>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}
