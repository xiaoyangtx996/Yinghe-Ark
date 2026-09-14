'use client'

import { useEffect, useState } from 'react'
import ConfigStage from './ConfigStage'
import ScriptStage from './ScriptStage'
import StoryboardStage from './StoryboardStage'
import VideoStageRoute from './VideoStageRoute'
import EditorGateStage from './EditorGateStage'
import VoiceStageRoute from './VoiceStageRoute'

interface WorkspaceStageContentProps {
  currentStage: string
  onGoVideos?: () => void
}

const PREMOUNT_ORDER = ['script', 'storyboard', 'videos', 'voice', 'editor'] as const

function stagePaneClass(active: boolean): string {
  // Keep flex layout classes always; only toggle `hidden` so imperative flips stay one classList op.
  return active
    ? 'flex min-h-0 flex-1 flex-col'
    : 'hidden flex min-h-0 flex-1 flex-col'
}

function scheduleIdle(cb: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  if (typeof window.requestIdleCallback === 'function') {
    const id = window.requestIdleCallback(() => cb(), { timeout: 1500 })
    return () => window.cancelIdleCallback(id)
  }
  const id = window.setTimeout(cb, 200)
  return () => window.clearTimeout(id)
}

/**
 * Keep visited stages mounted (hidden) so capsule switches do not remount heavy trees.
 * Idle premount warms the rest after first paint so the first hop to each stage is cheap.
 */
export default function WorkspaceStageContent({
  currentStage,
  onGoVideos,
}: WorkspaceStageContentProps) {
  const [mounted, setMounted] = useState<Set<string>>(() => new Set([currentStage]))

  useEffect(() => {
    setMounted((prev) => {
      if (prev.has(currentStage)) return prev
      const next = new Set(prev)
      next.add(currentStage)
      if (currentStage === 'script' || currentStage === 'assets') {
        next.add('script')
        next.add('assets')
      }
      return next
    })
  }, [currentStage])

  useEffect(() => {
    let cancelled = false
    let cancelIdle = () => {}
    let index = 0

    const pump = () => {
      if (cancelled) return
      const nextId = PREMOUNT_ORDER[index]
      index += 1
      if (!nextId) return
      setMounted((prev) => {
        if (prev.has(nextId)) return prev
        const next = new Set(prev)
        next.add(nextId)
        if (nextId === 'script') next.add('assets')
        return next
      })
      cancelIdle = scheduleIdle(pump)
    }

    cancelIdle = scheduleIdle(pump)
    return () => {
      cancelled = true
      cancelIdle()
    }
  }, [])

  const showScript = currentStage === 'script' || currentStage === 'assets'
  const scriptMounted = mounted.has('script') || mounted.has('assets')

  return (
    <div className="flex min-h-0 flex-1 flex-col" data-workspace-stage-panes="">
      {mounted.has('config') ? (
        <div
          className={stagePaneClass(currentStage === 'config')}
          aria-hidden={currentStage !== 'config'}
          data-stage-pane="config"
        >
          <ConfigStage />
        </div>
      ) : null}

      {scriptMounted ? (
        <div
          className={stagePaneClass(showScript)}
          aria-hidden={!showScript}
          data-stage-pane="script"
        >
          <ScriptStage />
        </div>
      ) : null}

      {mounted.has('storyboard') ? (
        <div
          className={stagePaneClass(currentStage === 'storyboard')}
          aria-hidden={currentStage !== 'storyboard'}
          data-stage-pane="storyboard"
        >
          <StoryboardStage />
        </div>
      ) : null}

      {mounted.has('videos') ? (
        <div
          className={stagePaneClass(currentStage === 'videos')}
          aria-hidden={currentStage !== 'videos'}
          data-stage-pane="videos"
        >
          <VideoStageRoute />
        </div>
      ) : null}

      {mounted.has('voice') ? (
        <div
          className={stagePaneClass(currentStage === 'voice')}
          aria-hidden={currentStage !== 'voice'}
          data-stage-pane="voice"
        >
          <VoiceStageRoute />
        </div>
      ) : null}

      {mounted.has('editor') ? (
        <div
          className={stagePaneClass(currentStage === 'editor')}
          aria-hidden={currentStage !== 'editor'}
          data-stage-pane="editor"
        >
          <EditorGateStage onGoVideos={() => onGoVideos?.()} />
        </div>
      ) : null}
    </div>
  )
}
