'use client'

import type { CSSProperties, ReactNode } from 'react'
import { useCallback, useMemo, useState } from 'react'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  type DragEndEvent,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { CustomModel, Provider } from '../api-config'
import { ProviderCard } from '../api-config'
import { AppIcon } from '@/components/ui/icons'

interface DefaultModels {
  analysisModel?: string
  characterModel?: string
  locationModel?: string
  storyboardModel?: string
  editModel?: string
  videoModel?: string
  audioModel?: string
  lipSyncModel?: string
}

interface ApiConfigProviderListProps {
  modelProviders: Provider[]
  allModels: CustomModel[]
  defaultModels: DefaultModels
  getModelsForProvider: (providerId: string) => CustomModel[]
  onAddGeminiProvider: () => void
  onToggleModel: (modelKey: string, providerId: string) => void
  onUpdateApiKey: (providerId: string, apiKey: string) => void
  onUpdateBaseUrl: (providerId: string, baseUrl: string) => void
  onReorderProviders: (activeProviderId: string, overProviderId: string) => void
  onDeleteModel: (modelKey: string, providerId: string) => void
  onUpdateModel: (modelKey: string, updates: Partial<CustomModel>, providerId: string) => void
  onDeleteProvider: (providerId: string) => void
  onAddModel: (model: Omit<CustomModel, 'enabled'>) => void
  onFlushConfig: () => Promise<void>
  onToggleProviderHidden: (providerId: string, hidden: boolean) => void
  hideAddButton?: boolean
  labels: {
    providerPool: string
    providerPoolDesc: string
    dragToSort: string
    dragToSortHint: string
    hideProvider: string
    showProvider: string
    showHiddenProviders: string
    hideHiddenProviders: string
    hiddenProvidersPrefix: string
    addGeminiProvider: string
  }
}

export function ApiConfigProviderList({
  modelProviders,
  allModels,
  defaultModels,
  getModelsForProvider,
  onAddGeminiProvider,
  onToggleModel,
  onUpdateApiKey,
  onUpdateBaseUrl,
  onReorderProviders,
  onDeleteModel,
  onUpdateModel,
  onDeleteProvider,
  onAddModel,
  onFlushConfig,
  onToggleProviderHidden,
  hideAddButton = false,
  labels,
}: ApiConfigProviderListProps) {
  const [showHiddenProviders, setShowHiddenProviders] = useState(false)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      if (!over || active.id === over.id) return
      onReorderProviders(String(active.id), String(over.id))
    },
    [onReorderProviders],
  )

  const providerModelsById = useMemo(() => {
    const map = new Map<string, CustomModel[]>()
    for (const provider of modelProviders) {
      map.set(provider.id, getModelsForProvider(provider.id))
    }
    return map
  }, [getModelsForProvider, modelProviders])

  const hiddenProviders = useMemo(() => {
    return modelProviders.filter((provider) => provider.hidden === true)
  }, [modelProviders])

  const visibleProviders = useMemo(() => {
    const hiddenIds = new Set(hiddenProviders.map((provider) => provider.id))
    return modelProviders.filter((provider) => !hiddenIds.has(provider.id))
  }, [hiddenProviders, modelProviders])

  const hiddenProviderNames = hiddenProviders.map((provider) => provider.name).join(' / ')

  return (
    <div className="space-y-4">
      {!hideAddButton ? (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onAddGeminiProvider}
            className="glass-btn-base glass-btn-primary shrink-0 cursor-pointer px-3 py-1.5 text-sm font-semibold"
          >
            {labels.addGeminiProvider}
          </button>
        </div>
      ) : null}

      {visibleProviders.length > 0 ? (
        <div
          className="flex items-center gap-2 rounded-[var(--glass-radius-md)] border border-[var(--glass-stroke-base)] bg-[color-mix(in_srgb,var(--glass-bg-muted)_55%,transparent)] px-3 py-2.5 text-[length:var(--glass-font-size-caption)] text-[var(--glass-text-secondary)]"
          role="note"
        >
          <AppIcon name="gripVertical" className="h-3.5 w-3.5 shrink-0 text-[var(--film-gold)]" aria-hidden />
          <span>{labels.dragToSortHint}</span>
        </div>
      ) : null}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={visibleProviders.map((provider) => provider.id)} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-2">
            {visibleProviders.map((provider) => (
              <SortableProviderCardItem key={provider.id} providerId={provider.id} dragLabel={labels.dragToSort}>
                {({ dragHandle }) => (
                  <ProviderCard
                    provider={provider}
                    dragHandle={dragHandle}
                    models={providerModelsById.get(provider.id) || []}
                    allModels={allModels}
                    defaultModels={defaultModels}
                    onToggleModel={(modelKey) => onToggleModel(modelKey, provider.id)}
                    onUpdateApiKey={onUpdateApiKey}
                    onUpdateBaseUrl={onUpdateBaseUrl}
                    onDeleteModel={(modelKey) => onDeleteModel(modelKey, provider.id)}
                    onUpdateModel={(modelKey, updates) => onUpdateModel(modelKey, updates, provider.id)}
                    onDeleteProvider={onDeleteProvider}
                    onAddModel={onAddModel}
                    onFlushConfig={onFlushConfig}
                    onToggleProviderHidden={onToggleProviderHidden}
                    hideProviderLabel={labels.hideProvider}
                    showProviderLabel={labels.showProvider}
                  />
                )}
              </SortableProviderCardItem>
            ))}
          </div>
        </SortableContext>
      </DndContext>
      {hiddenProviders.length > 0 && (
        <>
          <button
            type="button"
            onClick={() => setShowHiddenProviders((prev) => !prev)}
            className="admin-section-card admin-provider-card !flex-none w-full cursor-pointer text-left transition-colors hover:border-[var(--glass-stroke-strong)]"
          >
            <div className="admin-section-card__head !border-b-0">
              <div className="min-w-0">
                <p className="admin-section-card__title truncate">
                  {showHiddenProviders
                    ? labels.hideHiddenProviders
                    : `${labels.showHiddenProviders} (${hiddenProviders.length})`}
                </p>
                <p className="admin-section-card__desc truncate">
                  {labels.hiddenProvidersPrefix}: {hiddenProviderNames}
                </p>
              </div>
              <AppIcon
                name={showHiddenProviders ? 'chevronUp' : 'chevronDown'}
                className="h-4 w-4 shrink-0 text-[var(--glass-text-secondary)]"
              />
            </div>
          </button>
          {showHiddenProviders && (
            <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-2">
              {hiddenProviders.map((provider) => (
                <div key={`hidden-${provider.id}`} className="h-full">
                  <ProviderCard
                    provider={provider}
                    models={providerModelsById.get(provider.id) || []}
                    allModels={allModels}
                    defaultModels={defaultModels}
                    onToggleModel={(modelKey) => onToggleModel(modelKey, provider.id)}
                    onUpdateApiKey={onUpdateApiKey}
                    onUpdateBaseUrl={onUpdateBaseUrl}
                    onDeleteModel={(modelKey) => onDeleteModel(modelKey, provider.id)}
                    onUpdateModel={(modelKey, updates) => onUpdateModel(modelKey, updates, provider.id)}
                    onDeleteProvider={onDeleteProvider}
                    onAddModel={onAddModel}
                    onFlushConfig={onFlushConfig}
                    onToggleProviderHidden={onToggleProviderHidden}
                    hideProviderLabel={labels.hideProvider}
                    showProviderLabel={labels.showProvider}
                  />
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

interface SortableProviderCardItemProps {
  providerId: string
  dragLabel: string
  children: (props: { dragHandle: ReactNode }) => ReactNode
}

function SortableProviderCardItem({ providerId, dragLabel, children }: SortableProviderCardItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: providerId })

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.9 : 1,
    zIndex: isDragging ? 20 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} className="h-full">
      {children({
        dragHandle: (
          <button
            type="button"
            aria-label={dragLabel}
            title={dragLabel}
            className="inline-flex h-8 w-8 cursor-grab items-center justify-center rounded-md text-[var(--glass-text-secondary)] touch-none transition-colors hover:bg-[var(--glass-bg-muted)] hover:text-[var(--glass-text-primary)] focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_var(--glass-focus-ring-strong)] active:cursor-grabbing"
            {...attributes}
            {...listeners}
          >
            <AppIcon name="gripVertical" className="h-3.5 w-3.5" />
          </button>
        ),
      })}
    </div>
  )
}
