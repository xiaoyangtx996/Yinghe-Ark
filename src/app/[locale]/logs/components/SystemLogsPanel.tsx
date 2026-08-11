'use client'

import { useCallback, useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { apiFetch } from '@/lib/api-fetch'
import { AppIcon } from '@/components/ui/icons'

interface LogFileInfo {
  name: string
  sizeBytes: number
  modifiedAt: string
}

interface LogPreview {
  name: string
  content: string
  truncated: boolean
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDateTime(value: string): string {
  try {
    return new Date(value).toLocaleString()
  } catch {
    return value
  }
}

const downloadAllHref = '/api/admin/download-logs'

function buildLogDownloadHref(fileName: string): string {
  return `/api/admin/logs?name=${encodeURIComponent(fileName)}&download=1`
}

export function SystemLogsPanel() {
  const t = useTranslations('logs')
  const [loading, setLoading] = useState(true)
  const [files, setFiles] = useState<LogFileInfo[]>([])
  const [preview, setPreview] = useState<LogPreview | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)

  const fetchFiles = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiFetch('/api/admin/logs')
      if (!res.ok) {
        setFiles([])
        return
      }
      const data = await res.json() as { files?: LogFileInfo[] }
      setFiles(data.files || [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchFiles()
  }, [fetchFiles])

  const openPreview = async (name: string) => {
    setPreviewLoading(true)
    try {
      const res = await apiFetch(`/api/admin/logs?name=${encodeURIComponent(name)}`)
      if (!res.ok) return
      const data = await res.json() as LogPreview
      setPreview(data)
    } finally {
      setPreviewLoading(false)
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--glass-stroke-base)] pb-4">
        <p className="text-sm text-[var(--glass-text-secondary)]">{t('subtitle')}</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void fetchFiles()}
            className="glass-btn-base glass-btn-secondary inline-flex items-center gap-1.5 px-3 py-2 text-sm"
          >
            <AppIcon name="refresh" className="h-4 w-4" />
            {t('refresh')}
          </button>
          <a
            href={downloadAllHref}
            download
            className="glass-btn-base glass-btn-primary inline-flex items-center gap-1.5 px-3 py-2 text-sm"
          >
            <AppIcon name="download" className="h-4 w-4" />
            {t('exportAllLogs')}
          </a>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full min-w-[640px] border-collapse text-left text-sm">
          <thead className="sticky top-0 z-10 bg-[var(--glass-bg-canvas)] text-[12px] uppercase tracking-[0.04em] text-[var(--glass-text-secondary)]">
            <tr>
              <th className="border-b border-[var(--glass-stroke-base)] px-4 py-3 font-semibold">{t('fileName')}</th>
              <th className="border-b border-[var(--glass-stroke-base)] px-4 py-3 font-semibold">{t('fileSize')}</th>
              <th className="border-b border-[var(--glass-stroke-base)] px-4 py-3 font-semibold">{t('modifiedAt')}</th>
              <th className="border-b border-[var(--glass-stroke-base)] px-4 py-3 font-semibold">{t('actions')}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="px-4 py-16 text-center text-[var(--glass-text-tertiary)]">{t('loading')}</td>
              </tr>
            ) : files.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-16 text-center text-[var(--glass-text-tertiary)]">{t('noLogFiles')}</td>
              </tr>
            ) : (
              files.map((file) => (
                <tr key={file.name} className="border-b border-[var(--glass-stroke-base)]/70 hover:bg-[var(--glass-bg-muted)]/60">
                  <td className="px-4 py-3 font-medium text-[var(--glass-text-primary)]">{file.name}</td>
                  <td className="px-4 py-3 text-[var(--glass-text-secondary)]">{formatBytes(file.sizeBytes)}</td>
                  <td className="px-4 py-3 text-[var(--glass-text-secondary)]">{formatDateTime(file.modifiedAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => void openPreview(file.name)}
                        disabled={previewLoading}
                        className="glass-btn-base glass-btn-secondary px-2.5 py-1.5 text-xs"
                      >
                        {t('view')}
                      </button>
                      <a
                        href={buildLogDownloadHref(file.name)}
                        download={file.name}
                        className="glass-btn-base glass-btn-secondary inline-flex items-center gap-1 px-2.5 py-1.5 text-xs"
                      >
                        <AppIcon name="download" className="h-3.5 w-3.5" />
                        {t('downloadFile')}
                      </a>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {preview ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 p-4">
          <div className="flex max-h-[85dvh] w-full max-w-4xl flex-col overflow-hidden rounded-[14px] border border-[var(--glass-stroke-base)] bg-[var(--glass-bg-surface)] shadow-[var(--glass-shadow-lg)]">
            <div className="flex items-start justify-between gap-3 border-b border-[var(--glass-stroke-base)] px-5 py-4">
              <div>
                <h3 className="text-base font-semibold text-[var(--glass-text-primary)]">{t('previewTitle')}</h3>
                <p className="mt-1 text-sm text-[var(--glass-text-secondary)]">{preview.name}</p>
                {preview.truncated ? (
                  <p className="mt-1 text-xs text-[var(--glass-tone-warning-fg)]">{t('previewTruncated')}</p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => setPreview(null)}
                className="glass-btn-base glass-btn-secondary px-3 py-1.5 text-sm"
              >
                {t('closePreview')}
              </button>
            </div>
            <pre className="min-h-0 flex-1 overflow-auto bg-[var(--glass-bg-canvas)] p-4 font-mono text-[12px] leading-relaxed text-[var(--glass-text-secondary)] whitespace-pre-wrap break-words">
              {preview.content || '—'}
            </pre>
          </div>
        </div>
      ) : null}
    </div>
  )
}
