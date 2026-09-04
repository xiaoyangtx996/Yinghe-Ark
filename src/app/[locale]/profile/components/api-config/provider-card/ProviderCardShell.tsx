'use client'

import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import type { ProviderCardProps, ProviderCardTranslator } from './types'
import { VERIFIABLE_PROVIDER_KEYS } from './types'
import type { UseProviderCardStateResult } from './hooks/useProviderCardState'
import { AppIcon } from '@/components/ui/icons'
import { getProviderKey, getProviderVisualIcon } from '../types'

interface ProviderCardShellProps {
  provider: ProviderCardProps['provider']
  dragHandle?: ProviderCardProps['dragHandle']
  onDeleteProvider: ProviderCardProps['onDeleteProvider']
  onToggleProviderHidden?: ProviderCardProps['onToggleProviderHidden']
  hideProviderLabel?: ProviderCardProps['hideProviderLabel']
  showProviderLabel?: ProviderCardProps['showProviderLabel']
  t: ProviderCardTranslator
  state: UseProviderCardStateResult
  children: ReactNode
}

export function getCompatibilityLayerBadgeLabel(
  providerId: string,
  t: ProviderCardTranslator,
): string | null {
  const providerKey = getProviderKey(providerId)
  if (providerKey === 'openai-compatible') return t('compatibilityLayerOpenAI')
  if (providerKey === 'gemini-compatible') return t('compatibilityLayerGemini')
  return null
}

export function ProviderCardShell({
  provider,
  dragHandle,
  onDeleteProvider,
  onToggleProviderHidden,
  hideProviderLabel,
  showProviderLabel,
  t,
  state,
  children,
}: ProviderCardShellProps) {
  const compatibilityLayerLabel = getCompatibilityLayerBadgeLabel(provider.id, t)
  const providerKey = getProviderKey(provider.id)
  const isVerifiable = VERIFIABLE_PROVIDER_KEYS.has(providerKey)
  const canTest = isVerifiable && !!provider.hasApiKey
  const isHidden = provider.hidden === true
  const hiddenToggleLabel = isHidden
    ? (showProviderLabel || t('showProvider'))
    : (hideProviderLabel || t('hideProvider'))
  const connectionLabel = provider.hasApiKey ? t('connected') : t('notConfigured')

  return (
    <article className="admin-section-card admin-provider-card flex h-full !flex-none flex-col overflow-hidden">
      <div className="admin-section-card__head">
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
          {dragHandle}
          {onToggleProviderHidden && (
            <button
              type="button"
              title={hiddenToggleLabel}
              aria-label={hiddenToggleLabel}
              onClick={() => {
                if (isHidden) {
                  onToggleProviderHidden(provider.id, false)
                } else {
                  if (window.confirm(t('hideProviderConfirm'))) {
                    onToggleProviderHidden(provider.id, true)
                  }
                }
              }}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--glass-radius-md)] text-[var(--glass-text-secondary)] transition-colors hover:bg-[var(--glass-bg-muted)] hover:text-[var(--glass-text-primary)] focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_var(--glass-focus-ring-strong)]"
            >
              <AppIcon name={isHidden ? 'plus' : 'minus'} className="h-3.5 w-3.5" />
            </button>
          )}
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--glass-radius-sm)] bg-[var(--glass-tone-info-bg)] text-[var(--film-gold)]">
            <AppIcon name={getProviderVisualIcon(provider.id)} className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <h3 className="admin-section-card__title !mb-0 leading-tight">{provider.name}</h3>
              {compatibilityLayerLabel && (
                <span className="admin-badge admin-badge--neutral">
                  {compatibilityLayerLabel}
                </span>
              )}
              <span
                className={`admin-badge ${provider.hasApiKey ? 'admin-badge--success' : 'admin-badge--danger'}`}
                role="status"
                aria-label={connectionLabel}
                title={connectionLabel}
              >
                {connectionLabel}
              </span>
            </div>
          </div>
        </div>
        <div className="admin-page-header__actions shrink-0">
          {isVerifiable && !state.isEditing && state.keyTestStatus === 'idle' && (
            <button
              onClick={state.handleTestOnly}
              disabled={!canTest}
              className={[
                'glass-btn-base inline-flex h-8 items-center gap-1 px-2.5 text-[length:var(--glass-font-size-caption)] font-medium',
                canTest
                  ? 'glass-btn-ghost border border-[var(--glass-stroke-base)] cursor-pointer'
                  : 'glass-btn-ghost cursor-not-allowed text-[var(--glass-text-disabled)]',
              ].join(' ')}
            >
              <AppIcon name="refresh" className="h-3 w-3" />
              {t('testConnection')}
            </button>
          )}
          {!state.isPresetProvider && onDeleteProvider && (
            <button
              onClick={() => onDeleteProvider(provider.id)}
              className="glass-btn-base glass-btn-ghost inline-flex h-8 items-center gap-1 px-2 text-[length:var(--glass-font-size-caption)] text-[var(--glass-text-secondary)] hover:text-[var(--glass-tone-danger-fg)]"
              title={t('delete')}
              aria-label={t('delete')}
            >
              <AppIcon name="trash" className="w-3.5 h-3.5" />
            </button>
          )}
          {state.tutorial && (
            <button
              onClick={() => state.setShowTutorial(true)}
              className="glass-btn-base glass-btn-ghost inline-flex h-8 items-center gap-1 border border-[var(--glass-stroke-base)] px-2.5 text-[length:var(--glass-font-size-caption)] font-medium"
            >
              <AppIcon name="bookOpen" className="h-3 w-3" />
              {t('tutorial.button')}
            </button>
          )}
        </div>
      </div>

      {state.showTutorial && state.tutorial && typeof document !== 'undefined'
        ? createPortal(
          <div
            className="fixed inset-0 z-[80] flex items-center justify-center glass-overlay"
            onClick={() => state.setShowTutorial(false)}
          >
            <div
              className="glass-surface-modal mx-4 w-full max-w-lg overflow-hidden rounded-xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-[var(--glass-stroke-base)] px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="glass-btn-base glass-btn-primary flex h-8 w-8 items-center justify-center rounded-lg text-[var(--glass-text-on-accent)]">
                    <AppIcon name="bookOpen" className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-[var(--glass-text-primary)]">
                      {provider.name} {t('tutorial.title')}
                    </h3>
                    <p className="text-xs text-[var(--glass-text-secondary)]">{t('tutorial.subtitle')}</p>
                  </div>
                </div>
                <button
                  onClick={() => state.setShowTutorial(false)}
                  className="glass-btn-base glass-btn-soft rounded-lg p-1.5"
                >
                  <AppIcon name="close" className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-4 p-5">
                {state.tutorial.steps.map((step, index) => (
                  <div key={index} className="flex gap-3">
                    <div className="glass-surface-soft flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[var(--glass-stroke-base)] text-xs font-medium text-[var(--glass-text-secondary)]">
                      {index + 1}
                    </div>
                    <div className="flex-1 pt-0.5">
                      <p className="text-sm leading-relaxed text-[var(--glass-text-secondary)]">
                        {t(`tutorial.steps.${step.text}`)}
                      </p>
                      {step.url && (
                        <a
                          href={step.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 inline-flex items-center gap-1 text-xs text-[var(--glass-text-secondary)] hover:text-[var(--glass-text-primary)] hover:underline"
                        >
                          <AppIcon name="externalLink" className="w-3 h-3" />
                          {t('tutorial.openLink')}
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-end border-t border-[var(--glass-stroke-base)] px-5 py-3">
                <button
                  onClick={() => state.setShowTutorial(false)}
                  className="glass-btn-base glass-btn-secondary rounded-lg px-4 py-2 text-sm font-medium"
                >
                  {t('tutorial.close')}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )
        : null}

      <div className="admin-section-card__body flex min-h-0 flex-1 flex-col gap-3 !py-3">
        {children}
      </div>
    </article>
  )
}
