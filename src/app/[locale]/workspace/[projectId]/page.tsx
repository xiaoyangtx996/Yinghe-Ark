'use client'
import { logInfo as _ulogInfo, logError as _ulogError } from '@/lib/logging/core'
import { apiFetch } from '@/lib/api-fetch'

import { useEffect, useState, useCallback, useMemo, startTransition, type ComponentType } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useQueryClient } from '@tanstack/react-query'
import Navbar from '@/components/Navbar'
import { SecondarySidebar } from '@/components/SecondarySidebar'
import AppBootScreen from '@/components/AppBootScreen'
import TaskStatusInline from '@/components/task/TaskStatusInline'
import ConfirmDialog from '@/components/ConfirmDialog'
import { useProjectData, useEpisodeData, useEpisodeIndex, useUserModels, fetchEpisodeData } from '@/lib/query/hooks'
import { queryKeys } from '@/lib/query/keys'
import { resolveEpisodeDataView } from '@/lib/query/episode-data-cache'
import type { NovelPromotionWorkspaceProps } from './modes/novel-promotion/types'
import { EarlyWorkspaceShell } from './EarlyWorkspaceShell'
import { EpisodeRowMenu } from './EpisodeRowMenu'
import { AppIcon } from '@/components/ui/icons'
import { readConfiguredAnalysisModel, shouldGuideToModelSetup } from '@/lib/workspace/model-setup'
import { resolveWorkspaceHasEpisodes } from '@/lib/workspace/workspace-episode-gate'
import { useRouter } from '@/i18n/navigation'
import { readApiErrorMessage } from '@/lib/api/read-error-message'
import { resolveTaskPresentationState } from '@/lib/task/presentation'
import dynamic from 'next/dynamic'
import type { SplitEpisode } from './modes/novel-promotion/components/smart-import/types'
import {
  decodeCompactEpisodeAt,
  filterCompactEpisodeIndexIndices,
  findCompactEpisodeIndexById,
  getCompactEpisodeIndexLength,
  parseCompactEpisodeIndex,
  renameCompactEpisode,
  resolveLatestCompactEpisodeId,
  type CompactEpisodeIndex,
} from '@/lib/projects/episode-index'
import { EPISODE_INDEX_REMOTE_THRESHOLD } from '@/lib/projects/episode-index-query'
import { useRemoteEpisodeIndex } from '@/lib/query/hooks/useRemoteEpisodeIndex'
import type { SecondaryListSource } from '@/components/SecondarySidebar'

import { isWorkspaceStage, resolveWorkspaceStage, type WorkspaceStage } from '@/lib/workspace/resolve-workspace-stage'
import {
  applyWorkspaceStagePanes,
  mergeWorkspaceSearchParams,
  readWorkspaceQueryMirror,
  replaceBrowserWorkspaceQuery,
} from '@/lib/workspace/workspace-url-query'

const SmartImportWizard = dynamic(
  () => import('./modes/novel-promotion/components/SmartImportWizard').then((m) => m.default),
  { ssr: false },
)

const ModelCapabilityDropdown = dynamic(
  () =>
    import('@/components/ui/config-modals/ModelCapabilityDropdown').then(
      (m) => m.ModelCapabilityDropdown,
    ),
  { ssr: false },
)
type Stage = WorkspaceStage

interface Episode {
  id: string
  episodeNumber: number
  name: string
  description?: string | null
  novelText?: string | null
  audioUrl?: string | null
  srtContent?: string | null
  createdAt: string
}

type NovelPromotionData = {
  episodes?: Episode[]
  episodeCount?: number
  importStatus?: string
  lastEpisodeId?: string | null
}

/**
 * 项目详情页 - 带侧边栏的剧集管理
 */
export default function ProjectDetailPage() {
  const params = useParams<{ projectId?: string }>()
  const router = useRouter()
  const searchParams = useSearchParams()
  if (!params?.projectId) {
    throw new Error('ProjectDetailPage requires projectId route param')
  }
  if (!searchParams) {
    throw new Error('ProjectDetailPage requires searchParams')
  }
  const projectId = params.projectId
  const t = useTranslations('workspaceDetail')
  const tc = useTranslations('common')
  const tStages = useTranslations('novelPromotion.stages')

  const [WorkspaceComp, setWorkspaceComp] = useState<ComponentType<NovelPromotionWorkspaceProps> | null>(null)
  useEffect(() => {
    let cancelled = false
    void import('./modes/novel-promotion/NovelPromotionWorkspace').then((mod) => {
      if (!cancelled) setWorkspaceComp(() => mod.default)
    })
    return () => {
      cancelled = true
    }
  }, [])

  // Mirror stage/episode locally: App Router router.replace soft-nav is too slow for menu clicks.
  const searchKey = searchParams.toString()
  const [queryMirror, setQueryMirror] = useState(() => readWorkspaceQueryMirror(searchKey))
  useEffect(() => {
    setQueryMirror(readWorkspaceQueryMirror(searchKey))
  }, [searchKey])
  useEffect(() => {
    const onPopState = () => {
      setQueryMirror(readWorkspaceQueryMirror(window.location.search))
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  const urlStage = queryMirror.stage as Stage | null
  const urlEpisodeId = queryMirror.episode
  const currentUrlStage = isWorkspaceStage(urlStage) ? urlStage : null

  // 🔥 React Query 数据获取（壳层与剧集索引分轨）
  const queryClient = useQueryClient()
  const { data: project, error: projectError } = useProjectData(projectId)
  const error = projectError?.message || null

  // 视图状态（仅 UI）
  const [isGlobalAssetsView, setIsGlobalAssetsView] = useState(false)
  const [isCheckingModelSetup, setIsCheckingModelSetup] = useState(true)
  const [needsModelSetup, setNeedsModelSetup] = useState(false)
  const [analysisModelDraft, setAnalysisModelDraft] = useState('')
  const [isModelSetupModalOpen, setIsModelSetupModalOpen] = useState(false)
  const [modelSetupSaving, setModelSetupSaving] = useState(false)
  const [episodePendingDelete, setEpisodePendingDelete] = useState<{ id: string; name: string } | null>(null)
  const [episodePendingRename, setEpisodePendingRename] = useState<{ id: string; name: string } | null>(null)
  const [renameDraft, setRenameDraft] = useState('')

  // Query-only updates: native replaceState + deferred React mirror.
  // Visible stage panes flip imperatively in updateUrlStage so clicks stay <16ms.
  const updateUrlParams = useCallback((updates: { stage?: string; episode?: string | null }) => {
    const liveSearch = typeof window !== 'undefined' ? window.location.search : `?${searchKey}`
    const params = mergeWorkspaceSearchParams(liveSearch || searchKey, updates)
    const nextMirror = {
      stage: params.get('stage'),
      episode: params.get('episode'),
    }
    replaceBrowserWorkspaceQuery(params)
    startTransition(() => {
      setQueryMirror(nextMirror)
    })
  }, [searchKey])

  // Stage 状态完全由 URL mirror 控制；editor 保留为诚实门闸页（不再静默改写到 videos）
  const effectiveStage = resolveWorkspaceStage(currentUrlStage)

  const novelPromotionData = project?.novelPromotionData as NovelPromotionData | undefined
  const episodeCount = novelPromotionData?.episodeCount ?? 0
  const useRemoteIndex = episodeCount >= EPISODE_INDEX_REMOTE_THRESHOLD

  const { data: episodeCompact } = useEpisodeIndex(projectId, { enabled: !useRemoteIndex })

  // Prefer URL / lastEpisodeId so remote mode can paint without a full index.
  const focusEpisodeId = urlEpisodeId || novelPromotionData?.lastEpisodeId || null
  const remote = useRemoteEpisodeIndex(projectId, {
    enabled: useRemoteIndex && !!project,
    total: episodeCount,
    focusId: focusEpisodeId,
  })

  const indexLength = useRemoteIndex
    ? episodeCount
    : getCompactEpisodeIndexLength(episodeCompact)

  const hasEpisodes = resolveWorkspaceHasEpisodes({
    episodeCount,
    indexLength: useRemoteIndex ? episodeCount : getCompactEpisodeIndexLength(episodeCompact),
  })

  // 剧集导航状态单源：URL（无本地副本）
  const selectedEpisodeId = useMemo(() => {
    if (urlEpisodeId) {
      if (useRemoteIndex) return urlEpisodeId
      if (!episodeCompact) return urlEpisodeId
      if (findCompactEpisodeIndexById(episodeCompact, urlEpisodeId) >= 0) return urlEpisodeId
    }
    if (useRemoteIndex) {
      return novelPromotionData?.lastEpisodeId || focusEpisodeId
    }
    if (!episodeCompact || indexLength === 0) return null
    return resolveLatestCompactEpisodeId(episodeCompact)
  }, [
    episodeCompact,
    focusEpisodeId,
    indexLength,
    novelPromotionData?.lastEpisodeId,
    urlEpisodeId,
    useRemoteIndex,
  ])

  const activeSourceIndex = useMemo(() => {
    if (useRemoteIndex) return remote.activeSourceIndex
    if (!episodeCompact || !selectedEpisodeId) return -1
    return findCompactEpisodeIndexById(episodeCompact, selectedEpisodeId)
  }, [episodeCompact, remote.activeSourceIndex, selectedEpisodeId, useRemoteIndex])

  // 更新URL中的stage参数；先命令式翻 pane，再异步同步 React mirror / prefetch。
  const updateUrlStage = useCallback((stage: string) => {
    applyWorkspaceStagePanes(stage)
    updateUrlParams({ stage })
    const nextView = resolveEpisodeDataView(stage)
    if (selectedEpisodeId && (nextView === 'full' || nextView === 'panels')) {
      startTransition(() => {
        void queryClient.prefetchQuery({
          queryKey: queryKeys.episodeData(projectId, selectedEpisodeId, nextView),
          queryFn: () => fetchEpisodeData(projectId, selectedEpisodeId, nextView),
          staleTime: 30_000,
        })
      })
    }
  }, [projectId, queryClient, selectedEpisodeId, updateUrlParams])

  // Prefer URL episode id so episode GET can start in parallel with /data
  // (do not wait for episode list decode to choose an id).
  const episodeQueryId = urlEpisodeId || selectedEpisodeId

  // 🔥 使用 React Query 获取剧集数据（按 stage 分流 full/script）
  const { data: currentEpisode } = useEpisodeData(
    projectId,
    !isGlobalAssetsView ? episodeQueryId : null,
    resolveEpisodeDataView(effectiveStage),
  )

  // Once the workspace has painted an episode, keep panes warm (no boot tear-down).
  // Episode shell mounts as soon as project data is ready; body fills when GET returns.
  // 获取导入状态
  const importStatus = novelPromotionData?.importStatus

  // 零状态：无剧集 → 展示「导入分集 / 直接添加」双入口（SmartImportWizard · StepSource）
  // pending：恢复未完成的分集预览
  const isZeroState = !hasEpisodes
  const shouldShowImportWizard =
    !isGlobalAssetsView && (importStatus === 'pending' || isZeroState)

  // 仅「分集预览恢复」才强制先配模型；空态可选手动建集，不必挡整页
  const shouldGateImportWizardByModel = importStatus === 'pending' && !isGlobalAssetsView

  // Defer model catalog until import gate / setup modal — not on storyboard cold path.
  const userModelsQuery = useUserModels({
    enabled: shouldGateImportWizardByModel || isModelSetupModalOpen,
  })
  const llmModelOptions = userModelsQuery.data?.llm || []

  useEffect(() => {
    if (!shouldGateImportWizardByModel) return

    let canceled = false
    const checkDefaultModelSetup = async () => {
      setIsCheckingModelSetup(true)
      try {
        const response = await apiFetch('/api/user-preference')
        if (!response.ok) {
          _ulogError('[ProjectDetail] 获取用户默认模型失败:', { status: response.status })
          if (!canceled) {
            setNeedsModelSetup(true)
            setAnalysisModelDraft('')
          }
          return
        }

        const payload: unknown = await response.json()
        const configuredModel = readConfiguredAnalysisModel(payload)
        if (!canceled) {
          setAnalysisModelDraft(configuredModel || '')
          setNeedsModelSetup(shouldGuideToModelSetup(payload))
        }
      } catch (err) {
        _ulogError('[ProjectDetail] 检查默认模型失败:', err)
        if (!canceled) {
          setNeedsModelSetup(true)
          setAnalysisModelDraft('')
        }
      } finally {
        if (!canceled) {
          setIsCheckingModelSetup(false)
        }
      }
    }

    void checkDefaultModelSetup()
    return () => {
      canceled = true
    }
  }, [shouldGateImportWizardByModel])

  // 初始化 URL：缺失 episode 时回写默认（最后一集）。
  // URL 里已有 id 但不在列表中时不立刻覆盖（避免新建后 invalidate 竞态把最新集冲掉）。
  useEffect(() => {
    if (!project || isGlobalAssetsView || !hasEpisodes) return
    if (urlEpisodeId) {
      if (useRemoteIndex) return
      if (episodeCompact && findCompactEpisodeIndexById(episodeCompact, urlEpisodeId) >= 0) return
      return
    }
    if (selectedEpisodeId) {
      updateUrlParams({ episode: selectedEpisodeId })
    }
  }, [
    episodeCompact,
    hasEpisodes,
    isGlobalAssetsView,
    project,
    selectedEpisodeId,
    updateUrlParams,
    urlEpisodeId,
    useRemoteIndex,
  ])

  // 创建剧集
  const handleCreateEpisode = async (name: string, description?: string) => {
    const res = await apiFetch(`/api/novel-promotion/${projectId}/episodes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description })
    })

    if (!res.ok) {
      throw new Error(await readApiErrorMessage(res, t('createFailed')))
    }

    const data = await res.json()
    setIsGlobalAssetsView(false)
    // 先刷新列表再写 URL，避免「URL 有新 id、列表还没有」被回写逻辑冲掉
    await queryClient.invalidateQueries({ queryKey: queryKeys.projectData(projectId) })
    if (useRemoteIndex) {
      await remote.invalidate()
    } else {
      await queryClient.invalidateQueries({ queryKey: queryKeys.episodeIndex(projectId) })
      await queryClient.refetchQueries({ queryKey: queryKeys.episodeIndex(projectId) })
    }
    updateUrlParams({ episode: data.episode.id })
  }

  // 智能导入 - 完成后刷新数据（数据已由 SmartImportWizard 保存）
  const handleSmartImportComplete = async (_splitEpisodes: SplitEpisode[]) => {
    _ulogInfo('[Page] handleSmartImportComplete 被调用')

    try {
      await queryClient.invalidateQueries({ queryKey: queryKeys.projectData(projectId) })
      const shell = await queryClient.fetchQuery({
        queryKey: queryKeys.projectData(projectId),
        queryFn: () =>
          import('@/lib/query/hooks/useProjectData').then((m) => m.fetchProjectData(projectId)),
      })
      const shellNovel = shell.novelPromotionData as NovelPromotionData | undefined
      const count = shellNovel?.episodeCount ?? 0
      const lastId = shellNovel?.lastEpisodeId

      if (count >= EPISODE_INDEX_REMOTE_THRESHOLD) {
        // Remote hook enables on next render once episodeCount updates; just set URL.
        if (lastId) updateUrlParams({ episode: lastId })
        return
      }

      await queryClient.invalidateQueries({ queryKey: queryKeys.episodeIndex(projectId) })
      const res = await apiFetch(`/api/novel-promotion/${projectId}/episodes?view=index`)
      if (!res.ok) throw new Error(`refresh failed: ${res.status}`)
      const payload = await res.json()
      const compact = parseCompactEpisodeIndex(payload?.episodes)
      if (compact) {
        queryClient.setQueryData<CompactEpisodeIndex>(queryKeys.episodeIndex(projectId), compact)
        const latestId = resolveLatestCompactEpisodeId(compact)
        _ulogInfo('[Page] 获取到新剧集:', getCompactEpisodeIndexLength(compact), '个')
        if (latestId) {
          updateUrlParams({ episode: latestId })
          return
        }
      }
      if (lastId) updateUrlParams({ episode: lastId })
    } catch (err: unknown) {
      _ulogError('刷新失败:', err)
    }
  }

  // 重命名剧集
  const handleRenameEpisode = async (episodeId: string, newName: string) => {
    const res = await apiFetch(`/api/novel-promotion/${projectId}/episodes/${episodeId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName })
    })

    if (!res.ok) {
      throw new Error(t('renameFailed'))
    }

    if (useRemoteIndex) {
      await remote.invalidate()
    } else {
      queryClient.setQueryData<CompactEpisodeIndex>(queryKeys.episodeIndex(projectId), (prev) => {
        if (!prev) return prev
        return renameCompactEpisode(prev, episodeId, newName)
      })
      queryClient.invalidateQueries({ queryKey: queryKeys.episodeIndex(projectId) })
    }
    if (selectedEpisodeId) {
      queryClient.invalidateQueries({ queryKey: queryKeys.episodeData(projectId, selectedEpisodeId) })
    }
  }

  // 删除剧集
  const handleDeleteEpisode = async (episodeId: string) => {
    const res = await apiFetch(`/api/novel-promotion/${projectId}/episodes/${episodeId}`, {
      method: 'DELETE',
    })
    if (!res.ok) {
      throw new Error(t('deleteFailed'))
    }
    queryClient.invalidateQueries({ queryKey: queryKeys.projectData(projectId) })
    if (useRemoteIndex) {
      await remote.invalidate()
      if (episodeId === selectedEpisodeId) {
        updateUrlParams({ episode: null })
      }
    } else {
      queryClient.invalidateQueries({ queryKey: queryKeys.episodeIndex(projectId) })
      if (episodeId === selectedEpisodeId && episodeCompact) {
        const length = getCompactEpisodeIndexLength(episodeCompact)
        let best: { id: string; n: number } | null = null
        for (let i = 0; i < length; i++) {
          const row = decodeCompactEpisodeAt(episodeCompact, i)
          if (!row || row.id === episodeId) continue
          if (!best || row.episodeNumber > best.n) best = { id: row.id, n: row.episodeNumber }
        }
        updateUrlParams({ episode: best?.id ?? null })
      }
    }
  }

  // 选择剧集
  const handleEpisodeSelect = useCallback((episodeId: string) => {
    setIsGlobalAssetsView(false)
    updateUrlParams({ episode: episodeId })
  }, [updateUrlParams])

  const handleSaveDefaultAnalysisModel = async () => {
    const modelKey = analysisModelDraft.trim()
    if (!modelKey) {
      alert(t('modelSetup.selectModelFirst'))
      return
    }

    setModelSetupSaving(true)
    try {
      const response = await apiFetch('/api/user-preference', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analysisModel: modelKey }),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      setNeedsModelSetup(false)
      setIsModelSetupModalOpen(false)
    } catch (err) {
      _ulogError('[ProjectDetail] 保存默认分析模型失败:', err)
      alert(t('modelSetup.saveFailed'))
    } finally {
      setModelSetupSaving(false)
    }
  }

  // Loading: only block when we have no project shell yet (cached prefetch skips boot).
  const isInitializing = !project?.novelPromotionData && !error
  const initLoadingState = resolveTaskPresentationState({
    phase: 'processing',
    intent: 'generate',
    resource: 'text',
    hasOutput: false,
  })

  const episodeListSource = useMemo<SecondaryListSource | undefined>(() => {
    if (useRemoteIndex) {
      if (remote.isSearchMode && remote.searchHits) {
        const hits = remote.searchHits
        return {
          count: hits.length,
          activeSourceIndex: remote.activeSourceIndex,
          getItem: (index) => {
            const row = hits[index]
            return {
              id: row?.id || `search-missing-${index}`,
              label: row?.name || '…',
              active: !isGlobalAssetsView && !!row && selectedEpisodeId === row.id,
              onClick: () => {
                if (row) handleEpisodeSelect(row.id)
              },
            }
          },
        }
      }
      return {
        count: episodeCount,
        activeSourceIndex,
        getItem: (index) => {
          const row = remote.slots[index]
          return {
            id: row?.id || `remote-pending-${index}`,
            label: row?.name || '…',
            active: !isGlobalAssetsView && !!row && selectedEpisodeId === row.id,
            onClick: () => {
              if (row) handleEpisodeSelect(row.id)
            },
          }
        },
      }
    }

    if (!episodeCompact) return undefined
    return {
      count: indexLength,
      activeSourceIndex,
      getItem: (index) => {
        const row = decodeCompactEpisodeAt(episodeCompact, index)
        return {
          id: row?.id || `missing-${index}`,
          label: row?.name || '',
          active: !isGlobalAssetsView && !!row && selectedEpisodeId === row.id,
          onClick: () => {
            if (row) handleEpisodeSelect(row.id)
          },
        }
      },
      searchIndices: (query) => filterCompactEpisodeIndexIndices(episodeCompact, query),
    }
  }, [
    activeSourceIndex,
    episodeCompact,
    episodeCount,
    handleEpisodeSelect,
    indexLength,
    isGlobalAssetsView,
    remote.activeSourceIndex,
    remote.isSearchMode,
    remote.searchHits,
    remote.slots,
    selectedEpisodeId,
    useRemoteIndex,
  ])

  const handleVisibleRangeChange = useCallback(
    (start: number, end: number) => {
      if (useRemoteIndex && !remote.isSearchMode) {
        void remote.ensureRange(start, end)
      }
    },
    [remote, useRemoteIndex],
  )

  const openRenameEpisode = useCallback((episodeId: string, currentName: string) => {
    setEpisodePendingRename({ id: episodeId, name: currentName })
    setRenameDraft(currentName)
  }, [])

  const renderEpisodeTrailing = useCallback(
    (item: { id: string; label: string }) => (
      <EpisodeRowMenu
        episodeId={item.id}
        episodeName={item.label}
        onRename={openRenameEpisode}
        onDelete={(id, name) => setEpisodePendingDelete({ id, name })}
      />
    ),
    [openRenameEpisode],
  )

  if (isInitializing) {
    return <AppBootScreen />
  }

  // Error状态
  if (error || !project) {
    return (
      <div className="glass-page min-h-screen">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <div className="glass-surface p-6 text-center">
            <p className="text-[var(--glass-tone-danger-fg)] mb-4">{error || t('projectNotFound')}</p>
            <button
              onClick={() => router.push({ pathname: '/workspace' })}
              className="glass-btn-base glass-btn-primary px-6 py-2"
            >
              {t('backToWorkspace')}
            </button>
          </div>
        </main>
      </div>
    )
  }

  const handleAddEpisode = () => {
    void handleCreateEpisode(`${t('episode')} ${(novelPromotionData?.episodeCount ?? indexLength) + 1}`)
  }

  const submitRenameEpisode = () => {
    if (!episodePendingRename) return
    const nextName = renameDraft.trim()
    if (!nextName || nextName === episodePendingRename.name) {
      setEpisodePendingRename(null)
      return
    }
    void handleRenameEpisode(episodePendingRename.id, nextName)
    setEpisodePendingRename(null)
  }

  const confirmDeleteEpisode = () => {
    if (!episodePendingDelete) return
    void handleDeleteEpisode(episodePendingDelete.id)
    setEpisodePendingDelete(null)
  }

  return (
    <div
      className={`glass-page flex flex-col ${
        selectedEpisodeId && currentEpisode && !shouldShowImportWizard && !isGlobalAssetsView
          ? 'h-dvh min-h-0 overflow-hidden'
          : 'min-h-screen'
      }`}
    >
      <Navbar />

      <SecondarySidebar
        title={project.name}
        description={project.description || undefined}
        searchable
        searchPlaceholder={t('sidebar.searchPlaceholder')}
        searchEmptyHint={t('sidebar.searchEmpty')}
        headerAction={(
          <button
            type="button"
            onClick={() => router.push({ pathname: '/workspace' })}
            className="theater-secondary__exit-btn"
            title={t('exitToProjectsHint')}
            aria-label={t('exitToProjectsHint')}
          >
            <AppIcon name="chevronsLeft" className="h-4 w-4" />
          </button>
        )}
        navAction={(
          <button
            type="button"
            onClick={handleAddEpisode}
            className="theater-secondary__nav-action-btn"
            title={t('sidebar.addEpisode')}
            aria-label={t('sidebar.addEpisode')}
          >
            <AppIcon name="plus" className="h-5 w-5 shrink-0" />
          </button>
        )}
        listSource={episodeListSource}
        onSearchQueryChange={useRemoteIndex ? remote.setSearchQuery : undefined}
        onVisibleRangeChange={useRemoteIndex ? handleVisibleRangeChange : undefined}
        renderTrailing={renderEpisodeTrailing}
      />

      <main
        className={`flex-1 min-h-0 ${
          selectedEpisodeId && currentEpisode && !shouldShowImportWizard && !isGlobalAssetsView
            ? 'overflow-hidden'
            : 'overflow-y-auto'
        }`}
      >
        <div
          className={
            selectedEpisodeId && currentEpisode && !shouldShowImportWizard && !isGlobalAssetsView
              ? 'h-full px-2 py-2 lg:px-3 lg:py-2'
              : 'container mx-auto px-4 py-8'
          }
        >
          {isGlobalAssetsView && project.novelPromotionData ? (
            <div>
              <h1 className="text-2xl font-medium text-[var(--glass-text-primary)] mb-6">{t('globalAssets')}</h1>
              {WorkspaceComp ? (
                <WorkspaceComp
                  project={project}
                  projectId={projectId}
                  viewMode="global-assets"
                  urlStage={effectiveStage}
                  onStageChange={updateUrlStage}
                />
              ) : (
                <EarlyWorkspaceShell
                  activeStage={effectiveStage}
                  onStageChange={updateUrlStage}
                  labels={{
                    config: tStages('story'),
                    script: tStages('script'),
                    storyboard: tStages('storyboard'),
                    videos: tStages('video'),
                    voice: tStages('voice'),
                    editor: tStages('editor'),
                  }}
                />
              )}
            </div>
          ) : shouldShowImportWizard ? (
            isCheckingModelSetup && importStatus === 'pending' ? (
              <div className="glass-surface p-8 text-center">
                <div className="mx-auto mb-4 w-12 h-12 rounded-full flex items-center justify-center bg-[var(--glass-bg-muted)] text-[var(--glass-text-tertiary)]">
                  <TaskStatusInline state={initLoadingState} className="[&>span]:sr-only" />
                </div>
                <h2 className="text-xl font-medium text-[var(--glass-text-secondary)] mb-2">{tc('loading')}</h2>
              </div>
            ) : needsModelSetup && importStatus === 'pending' ? (
              <div className="glass-surface p-8 max-w-2xl mx-auto">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-[var(--glass-tone-warning-bg)] text-[var(--glass-tone-warning-fg)] flex items-center justify-center shrink-0">
                    <AppIcon name="alert" className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-medium text-[var(--glass-text-primary)] mb-2">
                      {t('modelSetup.title')}
                    </h2>
                    <p className="text-[var(--glass-text-secondary)] mb-5">
                      {t('modelSetup.description')}
                    </p>
                    <div className="flex flex-wrap gap-3">
                      <button
                        onClick={() => setIsModelSetupModalOpen(true)}
                        className="glass-btn-base glass-btn-primary px-4 py-2"
                      >
                        {t('modelSetup.configureNow')}
                      </button>
                      <button
                        onClick={() => router.push({ pathname: '/profile' })}
                        className="glass-btn-base glass-btn-secondary px-4 py-2"
                      >
                        {t('modelSetup.goProfile')}
                      </button>
                    </div>
                  </div>
                </div>

                {isModelSetupModalOpen && (
                  <div className="fixed inset-0 glass-overlay flex items-center justify-center z-50 backdrop-blur-sm">
                    <div className="glass-surface-modal p-6 w-full max-w-xl mx-4">
                      <h3 className="text-xl font-medium text-[var(--glass-text-primary)] mb-2">
                        {t('modelSetup.modalTitle')}
                      </h3>
                      <p className="text-sm text-[var(--glass-text-secondary)] mb-5">
                        {t('modelSetup.modalDescription')}
                      </p>

                      <div className="mb-6">
                        <label className="glass-field-label block mb-2">{t('modelSetup.selectModelLabel')}</label>
                        {userModelsQuery.isLoading ? (
                          <div className="text-sm text-[var(--glass-text-tertiary)]">{tc('loading')}</div>
                        ) : llmModelOptions.length === 0 ? (
                          <div className="text-sm text-[var(--glass-tone-warning-fg)]">
                            {t('modelSetup.noModelOptions')}
                          </div>
                        ) : (
                          <ModelCapabilityDropdown
                            models={llmModelOptions}
                            value={analysisModelDraft || undefined}
                            onModelChange={setAnalysisModelDraft}
                            capabilityFields={[]}
                            capabilityOverrides={{}}
                            onCapabilityChange={(field, rawValue, sample) => {
                              void field
                              void rawValue
                              void sample
                            }}
                            placeholder={t('modelSetup.selectModelPlaceholder')}
                          />
                        )}
                      </div>

                      <div className="flex justify-end gap-3">
                        <button
                          type="button"
                          onClick={() => setIsModelSetupModalOpen(false)}
                          className="glass-btn-base glass-btn-secondary px-4 py-2"
                          disabled={modelSetupSaving}
                        >
                          {tc('cancel')}
                        </button>
                        <button
                          type="button"
                          onClick={() => { void handleSaveDefaultAnalysisModel() }}
                          className="glass-btn-base glass-btn-primary px-4 py-2"
                          disabled={modelSetupSaving || llmModelOptions.length === 0 || !analysisModelDraft.trim()}
                        >
                          {modelSetupSaving ? tc('loading') : tc('save')}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <SmartImportWizard
                projectId={projectId}
                onManualCreate={() => handleCreateEpisode(`${t('episode')} 1`)}
                onImportComplete={handleSmartImportComplete}
                importStatus={importStatus}
              />
            )
          ) : selectedEpisodeId ? (
            WorkspaceComp ? (
              <WorkspaceComp
                project={project}
                projectId={projectId}
                episodeId={selectedEpisodeId}
                episode={currentEpisode as NovelPromotionWorkspaceProps['episode']}
                viewMode="episode"
                urlStage={effectiveStage}
                onStageChange={updateUrlStage}
                episodes={undefined}
                onEpisodeSelect={handleEpisodeSelect}
                onEpisodeCreate={handleAddEpisode}
                onEpisodeRename={handleRenameEpisode}
                onEpisodeDelete={handleDeleteEpisode}
              />
            ) : (
              <EarlyWorkspaceShell
                activeStage={effectiveStage}
                onStageChange={updateUrlStage}
                labels={{
                  config: tStages('story'),
                  script: tStages('script'),
                  storyboard: tStages('storyboard'),
                  videos: tStages('video'),
                  voice: tStages('voice'),
                  editor: tStages('editor'),
                }}
              />
            )
          ) : (
            <div className="glass-surface p-8 text-center">
              <div className="mx-auto mb-4 w-12 h-12 rounded-full flex items-center justify-center bg-[var(--glass-bg-muted)] text-[var(--glass-text-tertiary)]">
                <TaskStatusInline state={initLoadingState} className="[&>span]:sr-only" />
              </div>
              <h2 className="text-xl font-medium text-[var(--glass-text-secondary)] mb-2">{tc('loading')}</h2>
            </div>
          )}
        </div>
      </main>

      <ConfirmDialog
        show={!!episodePendingDelete}
        title={t('sidebar.deleteConfirm', { name: episodePendingDelete?.name || '' })}
        message=""
        confirmText={tc('delete')}
        cancelText={tc('cancel')}
        type="danger"
        onConfirm={confirmDeleteEpisode}
        onCancel={() => setEpisodePendingDelete(null)}
      />

      {episodePendingRename ? (
        <div className="film-confirm-root" role="presentation">
          <button
            type="button"
            className="film-confirm-backdrop"
            aria-label={tc('cancel')}
            onClick={() => setEpisodePendingRename(null)}
          />
          <div
            className="film-confirm"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="episode-rename-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="film-confirm__body">
              <h3 id="episode-rename-title" className="film-confirm__title">
                {t('sidebar.rename')}
              </h3>
              <input
                type="text"
                value={renameDraft}
                onChange={(e) => setRenameDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') submitRenameEpisode()
                  if (e.key === 'Escape') setEpisodePendingRename(null)
                }}
                className="film-confirm__field"
                placeholder={t('sidebar.newEpisodePlaceholder')}
                autoFocus
              />
            </div>
            <div className="film-confirm__actions">
              <button
                type="button"
                className="glass-btn-base glass-btn-secondary film-confirm__btn"
                onClick={() => setEpisodePendingRename(null)}
              >
                {tc('cancel')}
              </button>
              <button
                type="button"
                className="glass-btn-base glass-btn-primary film-confirm__btn"
                onClick={submitRenameEpisode}
                disabled={!renameDraft.trim()}
              >
                {t('sidebar.save')}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
