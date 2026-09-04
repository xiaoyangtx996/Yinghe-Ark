'use client'

/**
 * AI 帮我写 — 首页轻量模态框
 *
 * 用户输入创意/关键词/大纲，直接生成结果并回填首页主输入框
 */

import { useState, useCallback } from 'react'
import { AppIcon } from '@/components/ui/icons'

interface AiWriteModalProps {
  open: boolean
  loading: boolean
  onClose: () => void
  onStart: (prompt: string) => void
  t: (key: string) => string
}

export default function AiWriteModal({
  open,
  loading,
  onClose,
  onStart,
  t,
}: AiWriteModalProps) {
  const [promptText, setPromptText] = useState('')

  const handleClose = useCallback(() => {
    if (loading) return
    setPromptText('')
    onClose()
  }, [loading, onClose])

  const handleStart = useCallback(() => {
    if (!promptText.trim() || loading) return
    onStart(promptText.trim())
  }, [promptText, loading, onStart])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 glass-overlay flex items-center justify-center z-50 backdrop-blur-sm"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-lg mx-4 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 模态框容器 */}
        <div className="glass-surface-modal space-y-5 rounded-[var(--glass-radius-xl)] p-6">
          {/* 头部 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[var(--glass-radius-sm)] bg-[var(--glass-tone-info-bg)]"
              >
                <AppIcon name="sparkles" className="h-5 w-5 text-[var(--film-gold)]" />
              </div>
              <div>
                <h3 className="text-[length:var(--glass-font-size-h3)] font-medium leading-[var(--glass-line-height-heading)] text-[var(--glass-text-primary)]">
                  {t('modalTitle')}
                </h3>
                <p className="text-[length:var(--glass-font-size-caption)] leading-[var(--glass-line-height-caption)] text-[var(--glass-text-tertiary)]">
                  {t('modalSubtitle')}
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="glass-icon-btn-sm"
              disabled={loading}
            >
              <AppIcon name="close" className="w-4 h-4" />
            </button>
          </div>

          {/* 输入区域 */}
          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--glass-text-secondary)]">
              {t('inputLabel')}
            </label>
            <textarea
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              placeholder={t('placeholder')}
              className="glass-textarea-base app-scrollbar h-36 resize-none px-4 py-3 text-sm placeholder:text-[var(--glass-placeholder)]"
              disabled={loading}
              autoFocus
            />
          </div>

          {/* 提示文案 */}
          <div
            className="rounded-[var(--glass-radius-sm)] border border-[var(--glass-stroke-warning)] bg-[var(--glass-tone-warning-bg)] px-3 py-2 text-[length:var(--glass-font-size-caption)] leading-[var(--glass-line-height-caption)] text-[var(--glass-tone-warning-fg)]"
          >
            {t('hint')}
          </div>

          {/* 按钮区域 */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleClose}
              disabled={loading}
              className="glass-btn-base glass-btn-ghost flex-1 py-2.5 text-sm"
            >
              {t('cancel')}
            </button>
            <button
              onClick={handleStart}
              disabled={!promptText.trim() || loading}
              className="glass-btn-base glass-btn-primary glass-btn-comfortable flex flex-1 items-center justify-center gap-2 text-sm disabled:pointer-events-none"
            >
              <AppIcon name="sparkles" className="h-4 w-4" />
              <span>{loading ? '...' : t('startAiWrite')}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
