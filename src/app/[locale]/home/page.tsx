'use client'

/**
 * 首页 - 创作中心
 * 用户登录后的主入口页面：快速创作 + 最近项目
 */
import { useState, useEffect, useCallback, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { useTranslations } from 'next-intl'
import Navbar from '@/components/Navbar'
import AppBootScreen from '@/components/AppBootScreen'
import { AppIcon } from '@/components/ui/icons'
import StoryInputComposer from '@/components/story-input/StoryInputComposer'
import TypewriterHero from '@/components/home/TypewriterHero'
import { ART_STYLES, VIDEO_RATIOS } from '@/lib/constants'
import { DEFAULT_STYLE_PRESET_VALUE, STYLE_PRESETS } from '@/lib/style-presets'
import { Link, useRouter } from '@/i18n/navigation'
import { apiFetch } from '@/lib/api-fetch'
import { expandHomeStory } from '@/lib/home/ai-story-expand'
import { createHomeProjectLaunch } from '@/lib/home/create-project-launch'
import { formatDefaultProjectTimestamp } from '@/lib/projects/default-name'
import { formatProjectStatsLine } from '@/lib/projects/format-project-stats'
import { HOME_QUICK_START_MIN_ROWS } from '@/lib/ui/textarea-height'
import AiWriteModal from '@/components/home/AiWriteModal'
import CreateConfirmWizard from '@/components/home/CreateConfirmWizard'
import ProjectCardCover from '@/components/projects/ProjectCardCover'
import { getGenrePackOption } from '@/lib/genre-packs'
import { useQueryClient } from '@tanstack/react-query'
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
  genrePack?: string | null
  stats?: ProjectStats
}

const RECENT_COUNT = 5

export default function HomePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const queryClient = useQueryClient()
  const t = useTranslations('home')
  const tc = useTranslations('common')

  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [inputValue, setInputValue] = useState('')
  const [videoRatio, setVideoRatio] = useState('9:16')
  const [artStyle, setArtStyle] = useState('american-comic')
  const [stylePresetValue, setStylePresetValue] = useState<string>(DEFAULT_STYLE_PRESET_VALUE)
  const [createLoading, setCreateLoading] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [aiWriteOpen, setAiWriteOpen] = useState(false)
  const [aiWriteLoading, setAiWriteLoading] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  // 鉴权
  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push({ pathname: '/auth/signin' })
    }
  }, [session, status, router])

  // 获取最近项目
  const fetchRecentProjects = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: '1',
        pageSize: RECENT_COUNT.toString(),
      })
      const response = await apiFetch(`/api/projects?${params}`)
      if (response.ok) {
        const data = await response.json()
        setProjects(data.projects)
      }
    } catch {
      // 静默处理
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (session) {
      void fetchRecentProjects()
    }
  }, [session, fetchRecentProjects])

  // 打开确认向导（未确认前不创建项目）
  const handleOpenConfirm = () => {
    if (!inputValue.trim() || createLoading) return
    setCreateError(null)
    setConfirmOpen(true)
  }

  // 确认后创建项目并跳转
  const handleCreate = async () => {
    if (!inputValue.trim() || createLoading) return
    setCreateError(null)
    setCreateLoading(true)
    try {
      const storyText = inputValue.trim()
      const result = await createHomeProjectLaunch({
        apiFetch,
        projectName: t('defaultProjectName', {
          timestamp: formatDefaultProjectTimestamp(new Date()),
        }),
        storyText,
        videoRatio,
        artStyle,
        genrePack: stylePresetValue || null,
        episodeName: `${tc('episode')} 1`,
      })

      setConfirmOpen(false)
      router.push(result.target)
    } catch (error) {
      const message = error instanceof Error ? error.message : t('createFailed')
      setCreateError(message)
    } finally {
      setCreateLoading(false)
    }
  }

  // AI 帮我写 — 直接生成文本并回填首页输入框
  const handleAiWriteStart = async (prompt: string) => {
    if (aiWriteLoading) return
    setAiWriteLoading(true)
    try {
      const result = await expandHomeStory({
        apiFetch,
        prompt,
      })

      setInputValue(result.expandedText)
      setAiWriteOpen(false)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed'
      window.alert(message)
    } finally {
      setAiWriteLoading(false)
    }
  }

  // 比例选项（带推荐标签）
  const ratioOptions = useMemo(
    () => VIDEO_RATIOS.map((r) => ({ ...r, recommended: r.value === '9:16' })),
    []
  )

  // 风格选项（带推荐标签）
  const styleOptions = useMemo(
    () => ART_STYLES.map((s) => ({ ...s, recommended: s.value === 'realistic' })),
    []
  )
  // 时间格式化
  const formatTimeAgo = (dateString: string): string => {
    const diffMs = Date.now() - new Date(dateString).getTime()
    const diffMinutes = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    if (diffMinutes < 1) return t('ago.justNow')
    if (diffMinutes < 60) return t('ago.minutesAgo', { n: diffMinutes })
    if (diffHours < 24) return t('ago.hoursAgo', { n: diffHours })
    return t('ago.daysAgo', { n: diffDays })
  }

  if (status === 'loading' || !session) {
    return <AppBootScreen />
  }

  return (
    <div className="glass-page min-h-dvh">
      <Navbar />

      <main className="mx-auto w-full max-w-[960px] px-4 pb-8 pt-8 sm:px-6">
        <div className="mb-2">
          <TypewriterHero title={t('title')} subtitle={t('subtitle')} />
        </div>

        <div className="mt-3">
          <StoryInputComposer
            value={inputValue}
            onValueChange={(nextValue) => {
              setInputValue(nextValue)
              if (createError) {
                setCreateError(null)
              }
            }}
            placeholder={t('inputPlaceholder')}
            minRows={HOME_QUICK_START_MIN_ROWS}
            textareaClassName="px-0 pt-0 pb-3 align-top"
            videoRatio={videoRatio}
            onVideoRatioChange={setVideoRatio}
            ratioOptions={ratioOptions}
            artStyle={artStyle}
            onArtStyleChange={setArtStyle}
            styleOptions={styleOptions}
            stylePresetValue={stylePresetValue}
            onStylePresetChange={setStylePresetValue}
            stylePresetOptions={STYLE_PRESETS}
            primaryAction={(
              <button
                onClick={handleOpenConfirm}
                disabled={!inputValue.trim() || createLoading}
                className="glass-btn-base glass-btn-primary h-10 flex-shrink-0 px-5 text-sm"
              >
                {createLoading ? tc('loading') : t('startCreation')}
                <AppIcon name="arrowRight" className="w-4 h-4" />
              </button>
            )}
            secondaryActions={(
              <button
                onClick={() => setAiWriteOpen(true)}
                disabled={createLoading}
                className="glass-btn-base glass-btn-secondary flex h-10 flex-shrink-0 items-center gap-1.5 px-3 text-sm"
              >
                <AppIcon name="sparkles" className="w-4 h-4 text-[var(--film-gold)]" />
                <span className="font-medium text-[var(--glass-text-primary)]">
                  {t('aiWrite.trigger')}
                </span>
              </button>
            )}
            footer={createError ? (
              <p className="rounded-[var(--glass-radius-sm)] border border-[var(--glass-stroke-danger)] bg-[var(--glass-tone-danger-bg)] px-4 py-3 text-sm text-[var(--glass-tone-danger-fg)]">
                {createError}
              </p>
            ) : null}
          />
        </div>

        <AiWriteModal
          open={aiWriteOpen}
          loading={aiWriteLoading}
          onClose={() => setAiWriteOpen(false)}
          onStart={(prompt) => void handleAiWriteStart(prompt)}
          t={(key: string) => t(`aiWrite.${key}`)}
        />

        <CreateConfirmWizard
          open={confirmOpen}
          draft={{
            storyText: inputValue,
            videoRatio,
            artStyle,
            genrePack: stylePresetValue,
          }}
          onDraftChange={(next) => {
            setInputValue(next.storyText)
            setVideoRatio(next.videoRatio)
            setArtStyle(next.artStyle)
            setStylePresetValue(next.genrePack)
          }}
          submitting={createLoading}
          onCancel={() => {
            if (!createLoading) setConfirmOpen(false)
          }}
          onConfirm={() => void handleCreate()}
          t={(key, values) => t(`confirmWizard.${key}` as never, values as never)}
        />
      </main>

      {/* 最近项目 — 少卡时收窄网格，避免左侧单卡 + 右侧大空 */}
      <section className="mx-auto w-full max-w-[1400px] px-4 pb-10 sm:px-6 lg:px-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[length:var(--glass-font-size-title)] font-medium leading-[var(--glass-line-height-heading)] text-[var(--glass-text-primary)]">{t('recentProjects')}</h2>
          <Link
            href={{ pathname: '/workspace' }}
            className="text-xs font-medium text-[var(--glass-text-secondary)] transition-colors hover:text-[var(--film-gold)]"
          >
            {t('viewAll')}
          </Link>
        </div>

        {loading ? (
          <div className="mx-auto grid max-w-5xl grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="glass-surface animate-pulse overflow-hidden">
                <div className="aspect-[16/10] bg-[var(--glass-bg-muted)]" />
                <div className="space-y-2 p-3">
                  <div className="h-4 rounded bg-[var(--glass-bg-muted)]" />
                  <div className="h-3 w-2/3 rounded bg-[var(--glass-bg-muted)]" />
                </div>
              </div>
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="px-2 py-14 text-center">
            <AppIcon name="folderCards" className="mx-auto mb-3 h-8 w-8 text-[var(--glass-text-tertiary)]" />
            <p className="text-sm text-[var(--glass-text-tertiary)]">{t('noProjects')}</p>
          </div>
        ) : (
          <div
            className={`mx-auto grid grid-cols-1 gap-3 ${
              projects.length === 1
                ? 'max-w-sm'
                : projects.length === 2
                  ? 'max-w-2xl sm:grid-cols-2'
                  : projects.length === 3
                    ? 'max-w-5xl sm:grid-cols-2 lg:grid-cols-3'
                    : 'sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
            }`}
          >
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
                className="glass-surface group block overflow-hidden transition-colors hover:border-[var(--film-gold)]/45"
                onMouseEnter={() => {
                  prefetchProjectWorkspaceEntry(queryClient, project.id)
                  try {
                    router.prefetch({ pathname: `/workspace/${project.id}` })
                  } catch {
                    // ignore
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
                />
                <div className="p-3">
                  <h3 className="mb-1 line-clamp-1 text-sm font-medium text-[var(--glass-text-primary)] transition-colors group-hover:text-[var(--film-gold)]">
                    {project.name}
                  </h3>
                  {(() => {
                    const genreLabel = getGenrePackOption(project.genrePack)?.label
                    return genreLabel ? (
                      <p className="mb-1 text-[length:var(--glass-font-size-caption)] font-medium leading-[var(--glass-line-height-caption)] text-[var(--glass-text-tertiary)]">
                        {genreLabel}
                      </p>
                    ) : null
                  })()}
                  {(project.description || project.stats?.firstEpisodePreview) && (
                    <p className="mb-2 line-clamp-2 text-xs leading-relaxed text-[var(--glass-text-secondary)]">
                      {project.description || project.stats?.firstEpisodePreview}
                    </p>
                  )}
                  {statsLine ? (
                    <p className="mb-2 text-xs font-semibold text-[var(--glass-text-secondary)]">
                      {statsLine}
                    </p>
                  ) : null}
                  <div className="flex items-center gap-1 text-[length:var(--glass-font-size-caption)] leading-[var(--glass-line-height-caption)] text-[var(--glass-text-tertiary)]">
                    <AppIcon name="clock" className="h-3 w-3" />
                    {formatTimeAgo(project.updatedAt)}
                  </div>
                </div>
              </Link>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
