'use client'

/**
 * 首页 - 创作中心
 * 用户登录后的主入口页面：快速创作 + 最近项目
 */
import { useState, useEffect, useCallback, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { useTranslations } from 'next-intl'
import Navbar from '@/components/Navbar'
import { AppIcon, IconGradientDefs } from '@/components/ui/icons'
import StoryInputComposer from '@/components/story-input/StoryInputComposer'
import TypewriterHero from '@/components/home/TypewriterHero'
import { ART_STYLES, VIDEO_RATIOS } from '@/lib/constants'
import { DEFAULT_STYLE_PRESET_VALUE, STYLE_PRESETS } from '@/lib/style-presets'
import { Link, useRouter } from '@/i18n/navigation'
import { apiFetch } from '@/lib/api-fetch'
import { expandHomeStory } from '@/lib/home/ai-story-expand'
import { createHomeProjectLaunch } from '@/lib/home/create-project-launch'
import { formatDefaultProjectTimestamp } from '@/lib/projects/default-name'
import { HOME_QUICK_START_MIN_ROWS } from '@/lib/ui/textarea-height'
import AiWriteModal from '@/components/home/AiWriteModal'

interface ProjectStats {
  episodes: number
  images: number
  videos: number
  panels: number
  firstEpisodePreview: string | null
}

interface Project {
  id: string
  name: string
  description: string | null
  createdAt: string
  updatedAt: string
  stats?: ProjectStats
}

const RECENT_COUNT = 5

export default function HomePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
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

  // 创建项目并跳转
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
        episodeName: `${tc('episode')} 1`,
      })

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
    return (
      <div className="glass-page min-h-screen flex items-center justify-center">
        <div className="text-[var(--glass-text-secondary)]">{tc('loading')}</div>
      </div>
    )
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
                onClick={() => void handleCreate()}
                disabled={!inputValue.trim() || createLoading}
                className="glass-btn-base glass-btn-primary h-10 flex-shrink-0 px-5 text-sm disabled:opacity-50"
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
              <p className="rounded-[10px] border border-[var(--glass-stroke-danger)] bg-[var(--glass-tone-danger-bg)] px-4 py-3 text-sm text-[var(--glass-tone-danger-fg)]">
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
      </main>

      {/* 最近项目 */}
      <section className="mx-auto w-full max-w-[1400px] px-4 pb-10 sm:px-6 lg:px-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[15px] font-bold text-[var(--glass-text-primary)]">{t('recentProjects')}</h2>
          <Link
            href={{ pathname: '/workspace' }}
            className="text-xs font-medium text-[var(--glass-text-secondary)] transition-colors hover:text-[var(--film-gold)]"
          >
            {t('viewAll')}
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {projects.map((project, index) => (
              <Link
                key={project.id}
                href={{ pathname: `/workspace/${project.id}` }}
                className="glass-surface group block overflow-hidden transition-colors hover:border-[var(--film-gold)]/45"
              >
                <div
                  className="aspect-[16/10] border-b border-[var(--glass-stroke-base)]"
                  style={{
                    background:
                      index % 3 === 0
                        ? 'linear-gradient(135deg, #3a2e24, #1a1612)'
                        : index % 3 === 1
                          ? 'linear-gradient(135deg, #2f3a32, #15120f)'
                          : 'linear-gradient(135deg, #2a3340, #15120f)',
                  }}
                />
                <div className="p-3">
                  <h3 className="mb-1 line-clamp-1 text-sm font-bold text-[var(--glass-text-primary)] transition-colors group-hover:text-[var(--film-gold)]">
                    {project.name}
                  </h3>
                  {(project.description || project.stats?.firstEpisodePreview) && (
                    <p className="mb-2 line-clamp-2 text-xs leading-relaxed text-[var(--glass-text-secondary)]">
                      {project.description || project.stats?.firstEpisodePreview}
                    </p>
                  )}
                  {project.stats && (project.stats.episodes > 0 || project.stats.images > 0 || project.stats.videos > 0) && (
                    <div className="mb-2 flex items-center gap-3 text-xs font-semibold text-[var(--glass-text-secondary)]">
                      <IconGradientDefs className="absolute h-0 w-0" aria-hidden="true" />
                      {project.stats.episodes > 0 && (
                        <span className="inline-flex items-center gap-1">
                          <AppIcon name="statsEpisodeGradient" className="h-3.5 w-3.5" />
                          {project.stats.episodes}
                        </span>
                      )}
                      {project.stats.images > 0 && (
                        <span className="inline-flex items-center gap-1">
                          <AppIcon name="statsImageGradient" className="h-3.5 w-3.5" />
                          {project.stats.images}
                        </span>
                      )}
                      {project.stats.videos > 0 && (
                        <span className="inline-flex items-center gap-1">
                          <AppIcon name="statsVideoGradient" className="h-3.5 w-3.5" />
                          {project.stats.videos}
                        </span>
                      )}
                    </div>
                  )}
                  <div className="flex items-center gap-1 text-[10px] text-[var(--glass-text-tertiary)]">
                    <AppIcon name="clock" className="h-3 w-3" />
                    {formatTimeAgo(project.updatedAt)}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
