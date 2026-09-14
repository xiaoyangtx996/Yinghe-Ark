'use client'
import { logError as _ulogError } from '@/lib/logging/core'
import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useTranslations } from 'next-intl'
import { useQueryClient } from '@tanstack/react-query'
import Navbar from '@/components/Navbar'
import AppBootScreen from '@/components/AppBootScreen'
import ConfirmDialog from '@/components/ConfirmDialog'
import TaskStatusInline from '@/components/task/TaskStatusInline'
import { resolveTaskPresentationState } from '@/lib/task/presentation'
import { AppIcon } from '@/components/ui/icons'
import { shouldGuideToModelSetup } from '@/lib/workspace/model-setup'
import { Link, useRouter } from '@/i18n/navigation'
import { apiFetch } from '@/lib/api-fetch'
import { readApiErrorMessage } from '@/lib/api/read-error-message'
import { validateProjectDraft } from '@/lib/projects/validation'
import { formatProjectStatsLine } from '@/lib/projects/format-project-stats'
import ProjectCardCover from '@/components/projects/ProjectCardCover'
import { prefetchProjectWorkspaceEntry } from '@/lib/workspace/prefetch-project-entry'

interface ProjectStats {
  episodes: number
  images: number
  videos: number
  panels: number
  firstEpisodePreview: string | null
  coverImageUrl?: string | null
}

interface Project {
  id: string
  name: string
  description: string | null
  createdAt: string
  updatedAt: string
  totalCost?: number  // 项目总费用（CNY）
  genrePack?: string | null
  stats?: ProjectStats
}

interface Pagination {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

const PAGE_SIZE = 7 // 加上新建项目按钮正好8个，4列布局下2行
const DEFAULT_BILLING_CURRENCY = 'CNY'

function formatProjectCost(amount: number, currency = DEFAULT_BILLING_CURRENCY): string {
  if (currency === 'USD') return `$${amount.toFixed(2)}`
  return `¥${amount.toFixed(2)}`
}

function toProjectValidationMessage(
  issue: ReturnType<typeof validateProjectDraft>,
  t: ReturnType<typeof useTranslations>,
): string | null {
  if (!issue) return null

  switch (issue.code) {
    case 'PROJECT_NAME_REQUIRED':
      return t('validation.nameRequired')
    case 'PROJECT_NAME_TOO_LONG':
      return t('validation.nameTooLong')
    case 'PROJECT_DESCRIPTION_TOO_LONG':
      return t('validation.descriptionTooLong')
  }

  return null
}

export default function WorkspacePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createLoading, setCreateLoading] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  })
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const [editFormData, setEditFormData] = useState({
    name: '',
    description: ''
  })
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null)

  // 分页和搜索状态
  const [pagination, setPagination] = useState<Pagination>({ page: 1, pageSize: PAGE_SIZE, total: 0, totalPages: 0 })
  const [searchQuery, setSearchQuery] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [modelNotConfigured, setModelNotConfigured] = useState(false)

  const t = useTranslations('workspace')
  const tc = useTranslations('common')

  // 检查用户是否已登录
  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push({ pathname: '/auth/signin' })
      return
    }
  }, [session, status, router])

  // 获取项目列表
  const fetchProjects = useCallback(async (page: number = 1, search: string = '') => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: PAGE_SIZE.toString()
      })
      if (search.trim()) {
        params.set('search', search.trim())
      }

      const response = await apiFetch(`/api/projects?${params}`)
      if (response.ok) {
        const data = await response.json()
        setProjects(data.projects)
        setPagination(data.pagination)
      }
    } catch (error) {
      _ulogError('获取项目失败:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  // 初始加载和搜索/分页变化时重新获取
  useEffect(() => {
    if (session) {
      fetchProjects(pagination.page, searchQuery)
    }
  }, [session, pagination.page, searchQuery, fetchProjects])

  // 搜索处理
  const handleSearch = () => {
    setSearchQuery(searchInput)
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  // 打开新建项目弹窗并检测模型配置
  const openCreateModal = useCallback(() => {
    setCreateError(null)
    setShowCreateModal(true)
    // 异步检测模型配置状态
    void (async () => {
      try {
        const res = await apiFetch('/api/user-preference')
        if (res.ok) {
          const payload: unknown = await res.json()
          setModelNotConfigured(shouldGuideToModelSetup(payload))
        }
      } catch {
        // 忽略检测失败
      }
    })()
  }, [])

  // 分页处理
  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }))
  }

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault()
    const validationMessage = toProjectValidationMessage(validateProjectDraft(formData), t)
    if (validationMessage) {
      setCreateError(validationMessage)
      return
    }

    setCreateError(null)
    setCreateLoading(true)
    try {
      const response = await apiFetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        let shouldOpenModelSetup = true
        const preferenceResponse = await apiFetch('/api/user-preference')
        if (preferenceResponse.ok) {
          const preferencePayload: unknown = await preferenceResponse.json()
          shouldOpenModelSetup = shouldGuideToModelSetup(preferencePayload)
        } else {
          _ulogError('获取用户偏好失败:', { status: preferenceResponse.status })
        }

        // 创建成功后刷新第一页
        setSearchQuery('')
        setSearchInput('')
        setPagination(prev => ({ ...prev, page: 1 }))
        void fetchProjects(1, '')
        setShowCreateModal(false)
        setFormData({ name: '', description: '' })

        if (shouldOpenModelSetup) {
          alert(t('analysisModelRequiredAfterCreate'))
          router.push({ pathname: '/profile' })
        }
      } else {
        setCreateError(await readApiErrorMessage(response, t('createFailed')))
      }
    } catch (error) {
      _ulogError('创建项目失败:', error)
      setCreateError(error instanceof Error ? error.message : t('createFailed'))
    } finally {
      setCreateLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    // 转换为北京时间 (UTC+8)
    const beijingTime = new Date(date.getTime() + 8 * 60 * 60 * 1000)
    return beijingTime.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Shanghai'
    })
  }

  const handleEditProject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingProject) return

    const validationMessage = toProjectValidationMessage(validateProjectDraft(editFormData), t)
    if (validationMessage) {
      setEditError(validationMessage)
      return
    }

    setEditError(null)
    setCreateLoading(true)
    try {
      const response = await apiFetch(`/api/projects/${editingProject.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editFormData)
      })

      if (response.ok) {
        const data = await response.json()
        setProjects(projects.map(p => p.id === editingProject.id ? data.project : p))
        setShowEditModal(false)
        setEditingProject(null)
        setEditFormData({ name: '', description: '' })
      } else {
        setEditError(await readApiErrorMessage(response, t('updateFailed')))
      }
    } catch (error) {
      setEditError(error instanceof Error ? error.message : t('updateFailed'))
    } finally {
      setCreateLoading(false)
    }
  }

  const handleDeleteProject = async () => {
    if (!projectToDelete) return

    setDeletingProjectId(projectToDelete.id)
    setShowDeleteConfirm(false)

    try {
      const response = await apiFetch(`/api/projects/${projectToDelete.id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        // 删除成功后重新获取当前页
        fetchProjects(pagination.page, searchQuery)
      } else {
        alert(t('deleteFailed'))
      }
    } catch {
      alert(t('deleteFailed'))
    } finally {
      setDeletingProjectId(null)
      setProjectToDelete(null)
    }
  }

  const openDeleteConfirm = (project: Project, e: React.MouseEvent) => {
    e.preventDefault()  // 阻止 Link 导航
    e.stopPropagation()
    setProjectToDelete(project)
    setShowDeleteConfirm(true)
  }

  const cancelDelete = () => {
    setShowDeleteConfirm(false)
    setProjectToDelete(null)
  }

  const openEditModal = (project: Project, e: React.MouseEvent) => {
    e.preventDefault()  // 阻止 Link 导航
    e.stopPropagation()
    setEditingProject(project)
    setEditError(null)
    setEditFormData({
      name: project.name,
      description: project.description || ''
    })
    setShowEditModal(true)
  }

  if (status === 'loading' || !session) {
    return <AppBootScreen />
  }

  return (
    <div className="glass-page min-h-dvh">
      {/* Header - 统一导航栏 */}
      <Navbar />

      {/* Main Content */}
      <main className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-5 flex flex-col gap-4 border-b border-[var(--glass-stroke-base)] pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display mb-1 text-[length:var(--glass-font-size-h1)] font-semibold text-[var(--glass-text-primary)]">{t('title')}</h1>
            <p className="text-sm text-[var(--glass-text-secondary)]">{t('subtitle')}</p>
          </div>

          {/* 搜索框 */}
          <div className="flex gap-2">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder={t('searchPlaceholder')}
              className="glass-input-base w-64 px-3 py-2"
            />
            <button
              onClick={handleSearch}
              className="glass-btn-base glass-btn-primary px-4 py-2"
            >
              {t('searchButton')}
            </button>
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchInput('')
                  setSearchQuery('')
                  setPagination(prev => ({ ...prev, page: 1 }))
                }}
                className="glass-btn-base glass-btn-secondary px-4 py-2"
              >
                {t('clearButton')}
              </button>
            )}
          </div>
        </div>

        {/* Projects Grid / Empty State */}
        {loading ? (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="glass-surface p-6 animate-pulse">
                <div className="h-4 bg-[var(--glass-bg-muted)] rounded mb-3"></div>
                <div className="h-3 bg-[var(--glass-bg-muted)] rounded mb-2"></div>
                <div className="h-3 bg-[var(--glass-bg-muted)] rounded w-2/3"></div>
              </div>
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="mx-auto max-w-md rounded-[var(--glass-radius-md)] border border-dashed border-[var(--glass-stroke-base)] bg-[color-mix(in_srgb,var(--glass-bg-muted)_55%,transparent)] px-6 py-10 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-[var(--glass-radius-sm)] bg-[var(--glass-bg-muted)]">
              <AppIcon name="folderCards" className="h-7 w-7 text-[var(--glass-text-secondary)]" />
            </div>
            <h3 className="mb-2 text-lg font-medium text-[var(--glass-text-primary)]">
              {searchQuery ? t('noResults') : t('noProjects')}
            </h3>
            <p className="mb-6 text-[length:var(--glass-font-size-body)] text-[var(--glass-text-secondary)]">
              {searchQuery ? t('noResultsDesc') : t('noProjectsDesc')}
            </p>
            {!searchQuery && (
              <button
                onClick={() => openCreateModal()}
                className="glass-btn-base glass-btn-primary px-6 py-3"
              >
                {t('newProject')}
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <div
              onClick={() => openCreateModal()}
              className="glass-surface group flex min-h-[180px] cursor-pointer items-center justify-center border-dashed transition-colors hover:border-[var(--film-gold)]/50"
            >
              <div className="flex flex-col items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-[var(--glass-radius-sm)] bg-[var(--film-gold)] text-[var(--glass-text-on-accent)] transition-transform group-hover:scale-105">
                  <AppIcon name="plus" className="h-6 w-6" />
                </div>
                <span className="text-sm font-medium text-[var(--glass-text-secondary)] transition-colors group-hover:text-[var(--glass-text-primary)]">{t('newProject')}</span>
              </div>
            </div>

            {projects.map((project, index) => {
              const statsLine = formatProjectStatsLine(project.stats, (key, n) => {
                if (key === 'episodes') return t('statsEpisodesShort', { n })
                if (key === 'panels') return t('statsPanelsShort', { n })
                if (key === 'images') return t('statsImagesShort', { n })
                return t('statsVideosShort', { n })
              })
              return (
              <Link
                key={project.id}
                href={{ pathname: `/workspace/${project.id}` }}
                className="glass-surface group relative block cursor-pointer overflow-hidden transition-colors hover:border-[var(--film-gold)]/45"
                prefetch
                onMouseEnter={() => {
                  prefetchProjectWorkspaceEntry(queryClient, project.id)
                  try {
                    router.prefetch({ pathname: `/workspace/${project.id}` })
                  } catch {
                    // ignore prefetch errors
                  }
                }}
                onFocus={() => {
                  prefetchProjectWorkspaceEntry(queryClient, project.id)
                }}
              >
                <ProjectCardCover
                  name={project.name}
                  coverImageUrl={project.stats?.coverImageUrl}
                  genrePack={project.genrePack}
                  seedIndex={index}
                  className="aspect-[16/9]"
                />
                <div className="relative z-10 p-5">
                  {/* 操作按钮 */}
                  <div className="absolute top-3 right-3 z-20 flex gap-2 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                    <button
                      onClick={(e) => openEditModal(project, e)}
                      className="glass-btn-base glass-btn-secondary p-2 rounded-lg transition-colors"
                      title={t('editProject')}
                    >
                      <AppIcon name="editSquare" className="w-4 h-4 text-[var(--glass-tone-info-fg)]" />
                    </button>
                    <button
                      onClick={(e) => openDeleteConfirm(project, e)}
                      className="glass-btn-base glass-btn-secondary p-2 rounded-lg transition-colors"
                      title={t('deleteProject')}
                      disabled={deletingProjectId === project.id}
                    >
                      {deletingProjectId === project.id ? (
                        <TaskStatusInline
                          state={resolveTaskPresentationState({
                            phase: 'processing',
                            intent: 'process',
                            resource: 'text',
                            hasOutput: true,
                          })}
                          className="[&>span]:sr-only"
                        />
                      ) : (
                        <AppIcon name="trash" className="w-4 h-4 text-[var(--glass-tone-danger-fg)]" />
                      )}
                    </button>
                  </div>

                  {/* 标题 */}
                  <h3 className="mb-2 line-clamp-2 pr-20 text-lg font-medium text-[var(--glass-text-primary)] transition-colors group-hover:text-[var(--film-gold)]">
                    {project.name}
                  </h3>

                  {/* 描述：优先用户描述，fallback 到第一集故事 */}
                  {(project.description || project.stats?.firstEpisodePreview) && (
                    <div className="flex items-start gap-2 mb-4">
                      <AppIcon name="fileText" className="w-4 h-4 text-[var(--glass-text-tertiary)] mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-[var(--glass-text-secondary)] line-clamp-2 leading-relaxed">
                        {project.description || project.stats?.firstEpisodePreview}
                      </p>
                    </div>
                  )}

                  {/* 统计信息 — 可读文案 */}
                  {statsLine ? (
                    <p className="mb-3 text-sm font-semibold text-[var(--glass-text-secondary)]">
                      {statsLine}
                    </p>
                  ) : (
                    <p className="mb-3 text-xs text-[var(--glass-text-tertiary)]">{t('noContent')}</p>
                  )}

                  {/* 底部信息 */}
                  <div className="flex items-center justify-between text-[length:var(--glass-font-size-caption)] leading-[var(--glass-line-height-caption)] text-[var(--glass-text-tertiary)]">
                    <div className="flex items-center gap-1">
                      <AppIcon name="clock" className="w-3 h-3" />
                      {formatDate(project.updatedAt)}
                    </div>
                    {project.totalCost !== undefined && project.totalCost > 0 && (
                      <span className="font-mono text-[length:var(--glass-font-size-caption)] font-medium text-[var(--glass-text-secondary)]">
                        {formatProjectCost(project.totalCost)}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
              )
            })}
          </div>
        )}

        {/* 分页控件 */}
        {!loading && projects.length > 0 && pagination.totalPages > 1 && (
          <div className="mt-8 flex items-center justify-center gap-2">
            <button
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="glass-btn-base glass-btn-secondary px-3 py-2 disabled:cursor-not-allowed"
            >
              <AppIcon name="chevronLeft" className="w-5 h-5" />
            </button>

            {/* 页码按钮 */}
            {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
              .filter(page => {
                // 显示第一页、最后一页、当前页及其前后两页
                return page === 1 ||
                  page === pagination.totalPages ||
                  Math.abs(page - pagination.page) <= 2
              })
              .map((page, index, array) => (
                <span key={page} className="flex items-center">
                  {/* 显示省略号 */}
                  {index > 0 && array[index - 1] !== page - 1 && (
                    <span className="px-2 text-[var(--glass-text-tertiary)]">...</span>
                  )}
                  <button
                    onClick={() => handlePageChange(page)}
                    className={`glass-btn-base px-4 py-2 ${page === pagination.page
                      ? 'glass-btn-primary'
                      : 'glass-btn-secondary'
                      }`}
                  >
                    {page}
                  </button>
                </span>
              ))}

            <button
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="glass-btn-base glass-btn-secondary px-3 py-2 disabled:cursor-not-allowed"
            >
              <AppIcon name="chevronRight" className="w-5 h-5" />
            </button>

            <span className="ml-4 text-sm text-[var(--glass-text-tertiary)]">
              {t('totalProjects', { count: pagination.total })}
            </span>
          </div>
        )}
      </main>

      {/* Create Project Modal - 简化版，只有名称和描述 */}
      {showCreateModal && (
        <div className="fixed inset-0 glass-overlay flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="glass-surface-modal p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-medium text-[var(--glass-text-primary)] mb-4">{t('createProject')}</h2>
            {modelNotConfigured && (
              <div className="flex items-start gap-2 mb-4 px-3 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400">
                <AppIcon name="alert" className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="text-[length:var(--glass-font-size-caption)] leading-relaxed">
                  {t('modelNotConfigured.before')}
                  <Link
                    href={{ pathname: '/profile' }}
                    className="font-semibold underline underline-offset-2 hover:text-amber-900 dark:hover:text-amber-300 mx-0.5"
                    onClick={() => setShowCreateModal(false)}
                  >
                    {t('modelNotConfigured.link')}
                  </Link>
                  {t('modelNotConfigured.after')}
                </span>
              </div>
            )}
            <form onSubmit={handleCreateProject}>
              <div className="mb-4">
                <label htmlFor="name" className="glass-field-label block mb-2">
                  {t('projectName')} *
                </label>
                <input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => {
                    setFormData({ ...formData, name: e.target.value })
                    if (createError) {
                      setCreateError(null)
                    }
                  }}
                  className="glass-input-base w-full px-3 py-2"
                  placeholder={t('projectNamePlaceholder')}
                  maxLength={100}
                  required
                  autoFocus
                />
              </div>
              <div className="mb-6">
                <label htmlFor="description" className="glass-field-label block mb-2">
                  {t('projectDescription')}
                </label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => {
                    setFormData({ ...formData, description: e.target.value })
                    if (createError) {
                      setCreateError(null)
                    }
                  }}
                  className="glass-textarea-base w-full px-3 py-2"
                  placeholder={t('projectDescriptionPlaceholder')}
                  rows={3}
                  maxLength={500}
                />
              </div>
              {createError && (
                <p className="mb-4 rounded-[var(--glass-radius-sm)] border border-[var(--glass-stroke-danger)] bg-[var(--glass-tone-danger-bg)] px-3 py-2 text-sm text-[var(--glass-tone-danger-fg)]">
                  {createError}
                </p>
              )}
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false)
                    setCreateError(null)
                    setFormData({ name: '', description: '' })
                  }}
                  className="glass-btn-base glass-btn-secondary px-4 py-2"
                  disabled={createLoading}
                >
                  {tc('cancel')}
                </button>
                <button
                  type="submit"
                  className="glass-btn-base glass-btn-primary px-4 py-2"
                  disabled={createLoading || !formData.name.trim()}
                >
                  {createLoading ? t('creating') : t('createProject')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Project Modal */}
      {showEditModal && editingProject && (
        <div className="fixed inset-0 glass-overlay flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="glass-surface-modal p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-medium text-[var(--glass-text-primary)] mb-4">{t('editProject')}</h2>
            <form onSubmit={handleEditProject}>
              <div className="mb-4">
                <label htmlFor="edit-name" className="glass-field-label block mb-2">
                  {t('projectName')} *
                </label>
                <input
                  id="edit-name"
                  type="text"
                  value={editFormData.name}
                  onChange={(e) => {
                    setEditFormData({ ...editFormData, name: e.target.value })
                    if (editError) {
                      setEditError(null)
                    }
                  }}
                  className="glass-input-base w-full px-3 py-2"
                  placeholder={t('projectNamePlaceholder')}
                  maxLength={100}
                  required
                />
              </div>
              <div className="mb-6">
                <label htmlFor="edit-description" className="glass-field-label block mb-2">
                  {t('projectDescription')}
                </label>
                <textarea
                  id="edit-description"
                  value={editFormData.description}
                  onChange={(e) => {
                    setEditFormData({ ...editFormData, description: e.target.value })
                    if (editError) {
                      setEditError(null)
                    }
                  }}
                  className="glass-textarea-base w-full px-3 py-2"
                  placeholder={t('projectDescriptionPlaceholder')}
                  rows={3}
                  maxLength={500}
                />
              </div>
              {editError && (
                <p className="mb-4 rounded-[var(--glass-radius-sm)] border border-[var(--glass-stroke-danger)] bg-[var(--glass-tone-danger-bg)] px-3 py-2 text-sm text-[var(--glass-tone-danger-fg)]">
                  {editError}
                </p>
              )}
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false)
                    setEditingProject(null)
                    setEditError(null)
                    setEditFormData({ name: '', description: '' })
                  }}
                  className="glass-btn-base glass-btn-secondary px-4 py-2"
                  disabled={createLoading}
                >
                  {tc('cancel')}
                </button>
                <button
                  type="submit"
                  className="glass-btn-base glass-btn-primary px-4 py-2"
                  disabled={createLoading || !editFormData.name.trim()}
                >
                  {createLoading ? t('saving') : tc('save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 删除确认对话框 */}
      <ConfirmDialog
        show={showDeleteConfirm}
        title={t('deleteProject')}
        message={t('deleteConfirm', { name: projectToDelete?.name || '' })}
        confirmText={tc('delete')}
        cancelText={tc('cancel')}
        type="danger"
        onConfirm={handleDeleteProject}
        onCancel={cancelDelete}
      />
    </div>
  )
}
