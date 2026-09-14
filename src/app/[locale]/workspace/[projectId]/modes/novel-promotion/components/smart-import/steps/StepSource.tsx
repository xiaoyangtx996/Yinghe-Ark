'use client'

import { useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { countWords } from '@/lib/word-count'
import { AppIcon } from '@/components/ui/icons'

interface StepSourceProps {
  onManualCreate: () => void
  fileName: string | null
  rawContent: string
  importing: boolean
  error: string | null
  onImportFile: (file: File) => void
  onClearFile: () => void
  onSplit: () => void
  /** 继续导入模式：提示本次将追加到已有剧集 */
  continueHint?: boolean
}

export default function StepSource({
  onManualCreate,
  fileName,
  rawContent,
  importing,
  error,
  onImportFile,
  onClearFile,
  onSplit,
  continueHint = false,
}: StepSourceProps) {
  const t = useTranslations('smartImport')
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  const pickFile = (file: File | undefined | null) => {
    if (!file) return
    onImportFile(file)
  }

  const wordCount = rawContent ? countWords(rawContent) : 0
  const ready = Boolean(fileName && rawContent.trim())

  return (
    <div className="flex min-h-[calc(100vh-200px)] items-center justify-center p-6 sm:p-8">
      <div className="w-full max-w-5xl">
        <div className="mb-10 text-center">
          <h1 className="font-display text-3xl font-medium tracking-tight text-[var(--glass-text-primary)] sm:text-4xl">
            {t('title')}
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-base leading-relaxed text-[var(--glass-text-secondary)] sm:text-lg">
            {continueHint ? t('continueImportHint') : t('subtitle')}
          </p>
        </div>

        <div className="grid items-stretch gap-6 md:grid-cols-2">
          {/* Primary: import file → local chapter split */}
          <div className="relative flex flex-col rounded-2xl border-2 border-[color-mix(in_srgb,var(--film-gold)_45%,var(--glass-stroke-base))] bg-[var(--glass-bg-surface)] p-6 shadow-[var(--glass-shadow-sm)]">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--film-gold)_14%,var(--glass-bg-muted))]">
                  <AppIcon name="upload" className="h-6 w-6 text-[var(--film-gold)]" />
                </div>
                <div>
                  <h3 className="text-xl font-medium text-[var(--glass-text-primary)]">{t('importCard.title')}</h3>
                  <p className="text-sm text-[var(--glass-text-tertiary)]">{t('importCard.description')}</p>
                </div>
              </div>
              <span className="shrink-0 rounded-md bg-[color-mix(in_srgb,var(--film-gold)_16%,transparent)] px-2 py-0.5 text-xs font-medium text-[var(--film-gold-2)]">
                {t('importCard.recommended')}
              </span>
            </div>

            <input
              ref={inputRef}
              type="file"
              accept=".txt,.docx,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="sr-only"
              onChange={(e) => {
                pickFile(e.target.files?.[0])
                e.target.value = ''
              }}
            />

            <button
              type="button"
              disabled={importing}
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault()
                setDragOver(true)
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault()
                setDragOver(false)
                pickFile(e.dataTransfer.files?.[0])
              }}
              className={`flex min-h-[200px] flex-grow flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors ${
                dragOver
                  ? 'border-[var(--film-gold)] bg-[color-mix(in_srgb,var(--film-gold)_10%,var(--glass-bg-muted))]'
                  : 'border-[var(--glass-stroke-base)] bg-[var(--glass-bg-muted)] hover:border-[color-mix(in_srgb,var(--film-gold)_50%,var(--glass-stroke-base))]'
              } disabled:cursor-wait disabled:opacity-70`}
            >
              {ready ? (
                <>
                  <AppIcon name="fileText" className="mb-3 h-10 w-10 text-[var(--film-gold)]" />
                  <p className="max-w-full truncate text-sm font-medium text-[var(--glass-text-primary)]">{fileName}</p>
                  <p className="mt-1 text-xs text-[var(--glass-text-tertiary)]">
                    {wordCount.toLocaleString()} {t('upload.words')}
                  </p>
                  <p className="mt-3 text-xs text-[var(--glass-text-secondary)]">{t('upload.changeFile')}</p>
                </>
              ) : (
                <>
                  <AppIcon name="upload" className="mb-3 h-10 w-10 text-[var(--glass-text-tertiary)]" />
                  <p className="text-sm font-medium text-[var(--glass-text-primary)]">{t('upload.dropHint')}</p>
                  <p className="mt-2 text-xs text-[var(--glass-text-tertiary)]">{t('upload.supportedFormats')}</p>
                </>
              )}
            </button>

            <p className="mt-3 text-xs leading-relaxed text-[var(--glass-text-tertiary)]">
              {t('upload.markerHint')}
            </p>

            <div className="mt-4 flex items-center justify-between gap-3">
              {ready ? (
                <button
                  type="button"
                  onClick={onClearFile}
                  className="text-sm text-[var(--glass-text-tertiary)] hover:text-[var(--glass-text-secondary)]"
                >
                  {t('upload.clearFile')}
                </button>
              ) : (
                <span />
              )}
              <button
                type="button"
                onClick={onSplit}
                disabled={!ready || importing}
                className="glass-btn-base glass-btn-primary flex items-center gap-2 whitespace-nowrap rounded-xl px-5 py-2.5 font-medium disabled:cursor-not-allowed"
              >
                <span>{importing ? t('upload.importing') : t('upload.startSplit')}</span>
                {!importing ? <AppIcon name="arrowRightWide" className="h-4 w-4" /> : null}
              </button>
            </div>

            {error ? (
              <div className="mt-4 rounded-lg border border-[var(--glass-stroke-danger)] bg-[var(--glass-tone-danger-bg)] p-3 text-sm text-[var(--glass-tone-danger-fg)]">
                {error}
              </div>
            ) : null}
          </div>

          {/* Secondary: add a single empty episode */}
          <button
            type="button"
            onClick={onManualCreate}
            className="group flex cursor-pointer flex-col justify-center rounded-2xl border-2 border-[var(--glass-stroke-base)] bg-[var(--glass-bg-surface)] p-8 text-left transition-all duration-200 hover:border-[color-mix(in_srgb,var(--film-gold)_40%,var(--glass-stroke-base))] hover:shadow-[var(--glass-shadow-sm)]"
          >
            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--glass-bg-muted)] transition-colors duration-200 group-hover:bg-[color-mix(in_srgb,var(--film-gold)_12%,var(--glass-bg-muted))]">
              <AppIcon name="plus" className="h-7 w-7 text-[var(--glass-text-secondary)] transition-colors duration-200 group-hover:text-[var(--film-gold)]" />
            </div>
            <h3 className="mb-3 text-2xl font-medium text-[var(--glass-text-primary)]">{t('manualCreate.title')}</h3>
            <p className="mb-6 leading-relaxed text-[var(--glass-text-tertiary)]">{t('manualCreate.description')}</p>
            <div className="flex items-center font-medium text-[var(--film-gold)]">
              <span>{t('manualCreate.button')}</span>
              <AppIcon name="chevronRight" className="ml-2 h-5 w-5 transition-transform duration-200 group-hover:translate-x-1" />
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}
