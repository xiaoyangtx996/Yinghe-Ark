'use client'

import type { ProviderCardProps, ProviderCardTranslator } from './types'
import type { UseProviderCardStateResult } from './hooks/useProviderCardState'
import { AppIcon } from '@/components/ui/icons'
import VendorProbeReport, { resolveVendorProbeSummary } from '@/components/api-config/VendorProbeReport'

interface ProviderBaseFieldsProps {
  provider: ProviderCardProps['provider']
  t: ProviderCardTranslator
  state: UseProviderCardStateResult
}

export function ProviderBaseFields({ provider, t, state }: ProviderBaseFieldsProps) {
  const baseUrlPlaceholder = (() => {
    switch (state.providerKey) {
      case 'gemini-compatible':
        return 'https://your-api-domain.com'
      case 'openai-compatible':
        return 'https://api.openai.com/v1'
      default:
        return 'http://localhost:8000'
    }
  })()

  return (
    <>
      <div className="admin-tile flex flex-wrap items-center gap-2.5 sm:flex-nowrap">
          <span className="w-full shrink-0 whitespace-nowrap text-[length:var(--glass-font-size-caption)] font-semibold text-[var(--glass-text-secondary)] sm:w-[72px]">
            {t('apiKeyLabel')}
          </span>
          {state.isEditing ? (
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <input
                type="text"
                value={state.tempKey}
                onChange={(event) => state.setTempKey(event.target.value)}
                placeholder={t('enterApiKey')}
                className="glass-input-base flex-1 px-3 py-1.5 text-[length:var(--glass-font-size-caption)]"
                disabled={state.keyTestStatus === 'testing'}
                autoFocus
              />
              <button
                onClick={state.handleSaveKey}
                disabled={state.keyTestStatus === 'testing'}
                className="glass-icon-btn-sm"
                title={state.keyTestStatus === 'failed' ? t('testRetry') : t('save')}
                aria-label={state.keyTestStatus === 'failed' ? t('testRetry') : t('save')}
              >
                {state.keyTestStatus === 'testing' ? (
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : (
                  <AppIcon name="check" className="h-4 w-4" />
                )}
              </button>
              <button
                onClick={state.handleCancelEdit}
                disabled={state.keyTestStatus === 'testing'}
                className="glass-icon-btn-sm"
                title={t('cancel')}
                aria-label={t('cancel')}
              >
                <AppIcon name="close" className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="flex min-w-0 flex-1 items-center gap-2">
              {provider.hasApiKey ? (
                <>
                  <span className="min-w-0 flex-1 overflow-hidden whitespace-nowrap rounded-lg bg-[var(--glass-bg-surface)] px-3 py-1.5 font-mono text-[length:var(--glass-font-size-caption)] text-[var(--glass-text-secondary)]">
                    {state.showKey ? provider.apiKey : state.maskedKey}
                  </span>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      onClick={() => state.setShowKey(!state.showKey)}
                      className="glass-icon-btn-sm"
                      title={state.showKey ? t('hide') : t('show')}
                      aria-label={state.showKey ? t('hide') : t('show')}
                    >
                      {state.showKey ? (
                        <AppIcon name="eye" className="h-4 w-4" />
                      ) : (
                        <AppIcon name="eyeOff" className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      onClick={state.startEditKey}
                      className="glass-icon-btn-sm"
                      title={t('configure')}
                      aria-label={t('configure')}
                    >
                      <AppIcon name="edit" className="h-4 w-4" />
                    </button>
                  </div>
                </>
              ) : (
                <button
                  onClick={state.startEditKey}
                  className="glass-btn-base glass-btn-tone-info h-7 px-2.5 text-[length:var(--glass-font-size-caption)] font-medium"
                >
                  <AppIcon name="plus" className="h-3.5 w-3.5" />
                  <span>{t('connect')}</span>
                </button>
              )}
            </div>
          )}
      </div>

      {state.keyTestStatus !== 'idle' && (() => {
        const summary = resolveVendorProbeSummary(state.keyTestStatus, state.keyTestSteps)
        const summaryLabel =
          summary === 'testing'
            ? t('testing')
            : summary === 'passed'
              ? t('testPassed')
              : summary === 'partial'
                ? t('testPartial')
                : t('testFailed')
        return (
        <div>
          <VendorProbeReport
            title={t('testConnection')}
            summary={summary}
            summaryLabel={summaryLabel}
            testingLabel={t('testing')}
            steps={state.keyTestSteps}
            stepLabel={(name) => t(`testStep.${name}`)}
            onRetry={
              state.keyTestStatus === 'passed' || state.keyTestStatus === 'failed'
                ? state.handleTestOnly
                : undefined
            }
            onDismiss={
              state.keyTestStatus === 'passed' || state.keyTestStatus === 'failed'
                ? state.handleDismissTest
                : undefined
            }
            retryLabel={t('testRetry')}
            dismissLabel={t('close')}
            footer={
              state.keyTestStatus === 'failed' ? (
                <div className="flex items-start gap-2 rounded-lg bg-[var(--glass-tone-warning-bg)] px-3 py-2 text-[length:var(--glass-font-size-caption)] text-[var(--glass-text-primary)]">
                  <span className="mt-0.5 shrink-0 text-sm">&#9888;</span>
                  <span>{t('testWarning')}</span>
                </div>
              ) : null
            }
          />
        </div>
        )
      })()}

      {state.showBaseUrlEdit && (
        <div className="admin-tile flex flex-wrap items-center gap-2.5 sm:flex-nowrap">
            <span className="w-full shrink-0 whitespace-nowrap text-[length:var(--glass-font-size-caption)] font-semibold text-[var(--glass-text-secondary)] sm:w-[72px]">
              {t('baseUrl')}
            </span>
            {state.isEditingUrl ? (
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <input
                  type="text"
                  value={state.tempUrl}
                  onChange={(event) => state.setTempUrl(event.target.value)}
                  placeholder={baseUrlPlaceholder}
                  className="glass-input-base flex-1 px-3 py-1.5 text-[length:var(--glass-font-size-caption)] font-mono"
                  autoFocus
                />
                <button
                  onClick={state.handleSaveUrl}
                  className="glass-icon-btn-sm"
                  title={t('save')}
                  aria-label={t('save')}
                >
                  <AppIcon name="check" className="h-4 w-4" />
                </button>
                <button
                  onClick={state.handleCancelUrlEdit}
                  className="glass-icon-btn-sm"
                  title={t('cancel')}
                  aria-label={t('cancel')}
                >
                  <AppIcon name="close" className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex min-w-0 flex-1 items-center gap-2">
                {provider.baseUrl ? (
                  <>
                    <span className="min-w-0 flex-1 truncate rounded-lg bg-[var(--glass-bg-surface)] px-3 py-1.5 font-mono text-[length:var(--glass-font-size-caption)] text-[var(--glass-text-secondary)]">
                      {provider.baseUrl}
                    </span>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        onClick={state.startEditUrl}
                        className="glass-icon-btn-sm"
                        title={t('configure')}
                        aria-label={t('configure')}
                      >
                        <AppIcon name="edit" className="h-4 w-4" />
                      </button>
                    </div>
                  </>
                ) : (
                  <button
                    onClick={state.startEditUrl}
                    className="glass-btn-base glass-btn-tone-info h-7 px-2.5 text-[length:var(--glass-font-size-caption)] font-medium"
                  >
                    <AppIcon name="plus" className="h-3.5 w-3.5" />
                    <span>{t('configureBaseUrl')}</span>
                  </button>
                )}
              </div>
            )}
        </div>
      )}
    </>
  )
}
