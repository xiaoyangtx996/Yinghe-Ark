'use client'

import { useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useTranslations } from 'next-intl'
import { useQuery } from '@tanstack/react-query'
import Navbar from '@/components/Navbar'
import AppBootScreen from '@/components/AppBootScreen'
import { AppIcon } from '@/components/ui/icons'
import { Link, useRouter } from '@/i18n/navigation'
import { apiFetch } from '@/lib/api-fetch'
import { formatProjectStatsLine } from '@/lib/projects/format-project-stats'
import ProjectCardCover from '@/components/projects/ProjectCardCover'
import { queryKeys } from '@/lib/query/keys'

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
  description?: string | null
  updatedAt: string
  createdAt: string
  genrePack?: string | null
  stats?: ProjectStats
}

async function fetchFilmsProjects(): Promise<Project[]> {
  const response = await apiFetch('/api/projects?page=1&pageSize=100')
  if (!response.ok) return []
  const data = await response.json()
  const list = Array.isArray(data.projects) ? (data.projects as Project[]) : []
  return list.filter((project) => (project.stats?.videos ?? 0) > 0)
}

export default function FilmsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const t = useTranslations('films')
  const tc = useTranslations('common')
  const tn = useTranslations('nav')

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push({ pathname: '/auth/signin' })
    }
  }, [router, session, status])

  const filmsQuery = useQuery({
    queryKey: queryKeys.filmsProjects(),
    queryFn: fetchFilmsProjects,
    enabled: !!session,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  })

  if (status === 'loading') {
    return <AppBootScreen />
  }

  if (!session) {
    return null
  }

  const projects = filmsQuery.data ?? []
  const loading = filmsQuery.isPending && !filmsQuery.data

  return (
    <div className="glass-page min-h-dvh" data-page="films">
      <Navbar />

      <main className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-6 border-b border-[var(--glass-stroke-base)] pb-4">
          <p className="mb-1 text-[length:var(--glass-font-size-caption)] font-medium uppercase tracking-[0.1em] text-[var(--film-gold)]">
            {tn('railFilms')}
          </p>
          <h1 className="font-display text-[length:var(--glass-font-size-h1)] font-semibold text-[var(--glass-text-primary)]">
            {t('title')}
          </h1>
          <p className="mt-1 text-sm text-[var(--glass-text-secondary)]">{t('subtitle')}</p>
        </header>

        {loading ? (
          <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3">
            <span
              className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-[var(--glass-stroke-strong)] border-t-[var(--film-gold)]"
              aria-hidden
            />
            <p className="text-sm text-[var(--glass-text-secondary)]">{tc('loading')}</p>
          </div>
        ) : projects.length === 0 ? (
          <div className="glass-surface mx-auto max-w-lg px-6 py-10 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--film-gold)_14%,transparent)] text-[var(--film-gold)]">
              <AppIcon name="film" className="h-5 w-5" />
            </div>
            <h2 className="text-base font-semibold text-[var(--glass-text-primary)]">{t('emptyTitle')}</h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--glass-text-tertiary)]">{t('emptyDesc')}</p>
            <Link
              href={{ pathname: '/workspace' }}
              className="glass-btn-base glass-btn-primary mt-5 inline-flex px-4 py-2 text-sm font-semibold"
            >
              {t('goProjects')}
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {projects.map((project, index) => {
              const videoCount = project.stats?.videos ?? 0
              const statsLine = formatProjectStatsLine(project.stats, (key, n) => {
                if (key === 'episodes') return t('statEpisodes', { n })
                if (key === 'images') return t('statImages', { n })
                if (key === 'videos') return t('statVideos', { n })
                return t('statPanels', { n })
              })
              return (
                <Link
                  key={project.id}
                  href={{ pathname: `/workspace/${project.id}`, query: { stage: 'videos' } }}
                  className="glass-surface group block overflow-hidden transition-colors hover:border-[var(--film-gold)]/45"
                >
                  <ProjectCardCover
                    name={project.name}
                    coverImageUrl={project.stats?.coverImageUrl}
                    genrePack={project.genrePack}
                    seedIndex={index}
                  />
                  <div className="p-4">
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <h2 className="line-clamp-2 text-base font-semibold tracking-[-0.01em] text-[var(--glass-text-primary)] group-hover:text-[var(--film-gold)]">
                        {project.name}
                      </h2>
                      <span className="shrink-0 rounded-full bg-[color-mix(in_srgb,var(--film-gold)_14%,transparent)] px-2.5 py-0.5 text-[11px] font-semibold text-[var(--film-gold)]">
                        {t('videoCount', { count: videoCount })}
                      </span>
                    </div>
                    {statsLine ? (
                      <p className="text-xs text-[var(--glass-text-tertiary)]">{statsLine}</p>
                    ) : null}
                    <p className="mt-3 text-[12px] font-medium text-[var(--glass-text-secondary)]">
                      {t('openVideos')} →
                    </p>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
