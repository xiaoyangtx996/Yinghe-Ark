'use client'

import { useCallback, useState } from 'react'
import { AppIcon } from '@/components/ui/icons'
import { useToast } from '@/contexts/ToastContext'

interface WorkspaceTopActionsProps {
  onOpenAssetLibrary: () => void
  onOpenSettings: () => void
  onRefresh: () => Promise<void> | void
  assetLibraryLabel: string
  settingsLabel: string
  refreshTitle: string
  /** inline = document flow (default); fixed = legacy floating overlay */
  placement?: 'inline' | 'fixed'
}

export default function WorkspaceTopActions({
  onOpenAssetLibrary,
  onOpenSettings,
  onRefresh,
  assetLibraryLabel,
  settingsLabel,
  refreshTitle,
  placement = 'inline',
}: WorkspaceTopActionsProps) {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const { showToast } = useToast()

  const handleRefreshClick = useCallback(async () => {
    if (isRefreshing) {
      return
    }

    try {
      setIsRefreshing(true)
      await Promise.resolve(onRefresh())
      showToast(refreshTitle, 'success', 2400)
    } catch (error) {
      // 显式记录错误，保持“显式失败”原则，但不打断用户操作
      // eslint-disable-next-line no-console
      console.error('[WorkspaceTopActions] 刷新失败', error)
    } finally {
      setIsRefreshing(false)
    }
  }, [isRefreshing, onRefresh, refreshTitle, showToast])

  const rootClass =
    placement === 'fixed'
      ? 'fixed top-[4.75rem] right-6 z-40 workspace-actions'
      : 'relative z-10 workspace-actions'

  return (
    <div className={rootClass} data-placement={placement}>
      <button
        type="button"
        onClick={onOpenAssetLibrary}
        title={assetLibraryLabel}
        aria-label={assetLibraryLabel}
        className="glass-btn-base flex items-center gap-2 px-3 text-[var(--glass-text-primary)]"
      >
        <AppIcon name="package" className="h-4 w-4" />
        <span className="font-medium text-[13px] hidden md:inline tracking-[0.01em]">{assetLibraryLabel}</span>
      </button>
      <button
        type="button"
        onClick={onOpenSettings}
        title={settingsLabel}
        aria-label={settingsLabel}
        className="glass-btn-base flex items-center gap-2 px-3 text-[var(--glass-text-primary)]"
      >
        <AppIcon name="settingsHexMinor" className="h-4 w-4" />
        <span className="font-medium text-[13px] hidden md:inline tracking-[0.01em]">{settingsLabel}</span>
      </button>
      <button
        type="button"
        onClick={handleRefreshClick}
        className={`glass-btn-base flex items-center gap-2 px-2.5 text-[var(--glass-text-primary)] ${
          isRefreshing ? 'opacity-60 cursor-wait' : ''
        }`}
        title={refreshTitle}
        aria-label={refreshTitle}
        disabled={isRefreshing}
      >
        <AppIcon name="refresh" className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
      </button>
    </div>
  )
}
