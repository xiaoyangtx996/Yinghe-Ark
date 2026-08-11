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
        <div className="glass-surface-modal rounded-2xl p-6 space-y-5">
          {/* 头部 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[10px] bg-[var(--glass-tone-info-bg)]"
              >
                <AppIcon name="sparkles" className="h-5 w-5 text-[var(--film-gold)]" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[var(--glass-text-primary)]">
                  {t('modalTitle')}
                </h3>
                <p className="text-xs text-[var(--glass-text-tertiary)]">
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
            <label className="text-sm font-medium text-[var(--glass-text-secondary)] mb-2 block">
              {t('inputLabel')}
            </label>
            <textarea
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              placeholder={t('placeholder')}
              className="glass-textarea-base app-scrollbar h-36 px-4 py-3 text-sm resize-none placeholder:text-[var(--glass-text-tertiary)]"
              disabled={loading}
              autoFocus
            />
          </div>

          {/* 提示文案 */}
          <div
            className="rounded-[8px] px-3 py-2 text-xs leading-relaxed text-[var(--glass-text-tertiary)]"
            style={{ background: 'rgba(224,163,106,0.08)', border: '1px solid rgba(224,163,106,0.2)' }}
          >
            {t('hint')}
          </div>

          {/* 按钮区域 */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleClose}
              disabled={loading}
              className="flex-1 rounded-[10px] py-2.5 text-sm text-[var(--glass-text-tertiary)] transition-colors hover:text-[var(--glass-text-secondary)]"
            >
              {t('cancel')}
            </button>
            <button
              onClick={handleStart}
              disabled={!promptText.trim() || loading}
              className="glass-btn-base glass-btn-primary flex flex-1 items-center justify-center gap-2 py-3 text-sm font-semibold disabled:opacity-50"
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
