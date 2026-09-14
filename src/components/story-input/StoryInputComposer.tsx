'use client'

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CompositionEvent,
  type ReactNode,
} from 'react'
import { RatioSelector, StylePresetSelector, StyleSelector } from '@/components/selectors/RatioStyleSelectors'
import StorySelectionBubble from '@/components/story-input/StorySelectionBubble'
import type { AiStorySelectionMode } from '@/lib/story/ai-story-modes'
import { getTextareaCaretPosition } from '@/lib/ui/textarea-caret-position'
import { resolveTextareaTargetHeight } from '@/lib/ui/textarea-height'

interface StoryInputComposerOption {
  value: string
  label: string
  recommended?: boolean
}

interface StoryInputComposerStylePresetOption {
  value: string
  label: string
  description: string
}

export interface StorySelectionRange {
  start: number
  end: number
  text: string
}

interface StoryInputComposerProps {
  value: string
  onValueChange: (value: string) => void
  placeholder: string
  minRows: number
  disabled?: boolean
  maxHeightViewportRatio?: number
  /** Stretch composer to fill parent height (story workspace). */
  fillAvailableHeight?: boolean
  /** Show ratio / art style / genre selectors in the toolbar. Default true (home). */
  showVisualControls?: boolean
  topLeft?: ReactNode
  topRight?: ReactNode
  footer?: ReactNode
  secondaryActions?: ReactNode
  primaryAction?: ReactNode
  videoRatio?: string
  onVideoRatioChange?: (value: string) => void
  ratioOptions?: StoryInputComposerOption[]
  getRatioUsage?: (ratio: string) => string
  artStyle?: string
  onArtStyleChange?: (value: string) => void
  styleOptions?: StoryInputComposerOption[]
  stylePresetValue?: string
  onStylePresetChange?: (value: string) => void
  stylePresetOptions?: readonly StoryInputComposerStylePresetOption[]
  onCompositionStart?: () => void
  onCompositionEnd?: (event: CompositionEvent<HTMLTextAreaElement>) => void
  textareaClassName?: string
  selectionAi?: {
    enabled?: boolean
    loading?: boolean
    labels: {
      expand: string
      optimize: string
      rewrite: string
      working: string
    }
    onAction: (mode: AiStorySelectionMode, selection: StorySelectionRange) => void
  }
}

export default function StoryInputComposer({
  value,
  onValueChange,
  placeholder,
  minRows,
  disabled = false,
  maxHeightViewportRatio = 0.5,
  fillAvailableHeight = false,
  showVisualControls = true,
  topLeft,
  topRight,
  footer,
  secondaryActions,
  primaryAction,
  videoRatio = '9:16',
  onVideoRatioChange,
  ratioOptions = [],
  getRatioUsage,
  artStyle = 'american-comic',
  onArtStyleChange,
  styleOptions = [],
  stylePresetValue = '',
  onStylePresetChange,
  stylePresetOptions = [],
  onCompositionStart,
  onCompositionEnd,
  textareaClassName,
  selectionAi,
}: StoryInputComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const editorRef = useRef<HTMLDivElement>(null)
  const textareaMinHeightRef = useRef<number | null>(null)
  const [selection, setSelection] = useState<StorySelectionRange | null>(null)
  const [bubblePos, setBubblePos] = useState<{ top: number; left: number } | null>(null)

  const autoResizeTextarea = useCallback(() => {
    const el = textareaRef.current
    if (!el || typeof window === 'undefined') return
    if (fillAvailableHeight) {
      el.style.height = '100%'
      el.style.overflowY = 'auto'
      return
    }

    const maxHeight = window.innerHeight * maxHeightViewportRatio
    const oldHeight = el.offsetHeight
    const oldScrollTop = el.scrollTop

    if (textareaMinHeightRef.current === null && oldHeight > 0) {
      textareaMinHeightRef.current = oldHeight
    }

    const minHeight = textareaMinHeightRef.current ?? oldHeight

    el.style.transition = 'none'
    el.style.height = 'auto'
    const scrollHeight = el.scrollHeight
    const targetHeight = resolveTextareaTargetHeight({
      minHeight,
      maxHeight,
      scrollHeight,
    })
    el.style.height = `${oldHeight}px`
    el.scrollTop = oldScrollTop

    requestAnimationFrame(() => {
      el.scrollTop = oldScrollTop
      el.style.transition = 'height 200ms ease-out'
      el.style.height = `${targetHeight}px`
      el.style.overflowY = scrollHeight > maxHeight ? 'auto' : 'hidden'
    })
  }, [fillAvailableHeight, maxHeightViewportRatio])

  useEffect(() => {
    autoResizeTextarea()
  }, [value, autoResizeTextarea])

  const updateSelectionFromTextarea = useCallback(() => {
    if (!selectionAi?.enabled || disabled) {
      setSelection(null)
      setBubblePos(null)
      return
    }

    const el = textareaRef.current
    const editor = editorRef.current
    if (!el || !editor || typeof window === 'undefined') return

    const start = el.selectionStart
    const end = el.selectionEnd
    if (start === end) {
      setSelection(null)
      setBubblePos(null)
      return
    }

    const text = el.value.slice(start, end)
    if (!text.trim()) {
      setSelection(null)
      setBubblePos(null)
      return
    }

    const mid = Math.floor((start + end) / 2)
    const caret = getTextareaCaretPosition(el, mid)
    const editorRect = editor.getBoundingClientRect()
    const textareaRect = el.getBoundingClientRect()
    const relativeTop = textareaRect.top - editorRect.top + caret.top
    const relativeLeft = textareaRect.left - editorRect.left + caret.left

    setSelection({ start, end, text })
    setBubblePos({
      top: Math.max(8, relativeTop - 8),
      left: Math.min(Math.max(72, relativeLeft), editorRect.width - 72),
    })
  }, [disabled, selectionAi?.enabled])

  useEffect(() => {
    if (!selectionAi?.enabled) return

    const handleMouseUp = () => {
      window.setTimeout(updateSelectionFromTextarea, 0)
    }
    const handleKeyUp = () => {
      window.setTimeout(updateSelectionFromTextarea, 0)
    }
    const handleScroll = () => {
      updateSelectionFromTextarea()
    }

    document.addEventListener('mouseup', handleMouseUp)
    document.addEventListener('keyup', handleKeyUp)
    const el = textareaRef.current
    el?.addEventListener('scroll', handleScroll)
    return () => {
      document.removeEventListener('mouseup', handleMouseUp)
      document.removeEventListener('keyup', handleKeyUp)
      el?.removeEventListener('scroll', handleScroll)
    }
  }, [selectionAi?.enabled, updateSelectionFromTextarea])

  useEffect(() => {
    if (!selection) return
    if (selection.start >= value.length || selection.end > value.length) {
      setSelection(null)
      setBubblePos(null)
      return
    }
    const current = value.slice(selection.start, selection.end)
    if (current !== selection.text) {
      setSelection(null)
      setBubblePos(null)
    }
  }, [selection, value])

  const hasVisualControls =
    showVisualControls &&
    (ratioOptions.length > 0 || styleOptions.length > 0 || stylePresetOptions.length > 0)

  const showToolbar = hasVisualControls || Boolean(secondaryActions) || Boolean(primaryAction)
  const showTopBar = Boolean(topLeft || topRight)

  return (
    <div className="story-composer relative w-full" data-fill={fillAvailableHeight ? 'true' : 'false'}>
      <div className="story-composer__body">
        {showTopBar ? (
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="min-w-0">{topLeft}</div>
            <div className="shrink-0">{topRight}</div>
          </div>
        ) : null}

        <div className="story-composer__editor relative min-h-0 flex-1" ref={editorRef}>
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(event) => {
              onValueChange(event.target.value)
              if (!selectionAi?.loading) {
                setSelection(null)
                setBubblePos(null)
              }
            }}
            onSelect={updateSelectionFromTextarea}
            onCompositionStart={onCompositionStart}
            onCompositionEnd={onCompositionEnd}
            placeholder={placeholder}
            rows={minRows}
            disabled={disabled}
            className={`w-full resize-none border-none bg-transparent text-[15px] leading-relaxed tracking-[-0.01em] text-[var(--glass-text-primary)] outline-none placeholder:text-[var(--glass-text-tertiary)] app-scrollbar ${textareaClassName ?? 'p-5 pb-3'}`}
          />

          {selectionAi?.enabled && selection && bubblePos ? (
            <StorySelectionBubble
              top={bubblePos.top}
              left={bubblePos.left}
              loading={selectionAi.loading}
              disabled={disabled || selectionAi.loading}
              labels={selectionAi.labels}
              onExpand={() => selectionAi.onAction('expand', selection)}
              onOptimize={() => selectionAi.onAction('optimize', selection)}
              onRewrite={() => selectionAi.onAction('rewrite', selection)}
            />
          ) : null}
        </div>
      </div>

      {showToolbar ? (
        <div className="story-composer__toolbar">
          {hasVisualControls ? (
            <div className="min-w-0 flex-1 overflow-x-auto app-scrollbar">
              <div className="story-composer__selectors min-w-max">
                {ratioOptions.length > 0 && onVideoRatioChange ? (
                  <div className="w-[112px] flex-shrink-0">
                    <RatioSelector
                      value={videoRatio}
                      onChange={onVideoRatioChange}
                      options={ratioOptions}
                      getUsage={getRatioUsage}
                    />
                  </div>
                ) : null}
                {styleOptions.length > 0 && onArtStyleChange ? (
                  <div className="w-[124px] flex-shrink-0">
                    <StyleSelector
                      value={artStyle}
                      onChange={onArtStyleChange}
                      options={styleOptions}
                    />
                  </div>
                ) : null}
                {stylePresetOptions.length > 0 && onStylePresetChange ? (
                  <div className="w-[148px] flex-shrink-0">
                    <StylePresetSelector
                      value={stylePresetValue}
                      onChange={onStylePresetChange}
                      options={stylePresetOptions}
                    />
                  </div>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="min-w-0 flex-1" />
          )}
          <div className="flex shrink-0 items-center justify-end gap-2">
            {secondaryActions}
            {primaryAction}
          </div>
        </div>
      ) : null}

      {footer && (
        <div className="px-5 pb-4">
          {footer}
        </div>
      )}
    </div>
  )
}
