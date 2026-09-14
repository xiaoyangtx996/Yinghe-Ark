'use client'

/**
 * 小说推文模式 - 故事输入阶段 (Story View)
 * 画幅 / 风格 / 题材 → 项目配置；本页专注写作与进入拆解
 * 方向 C：选区气泡改文 + 顶部从 0 帮写 + 底部流程条
 */

import { useTranslations } from 'next-intl'
import { useState, useRef, useEffect, useCallback } from 'react'
import '@/styles/animations.css'
import AiWriteModal from '@/components/home/AiWriteModal'
import LongTextDetectionPrompt from '@/components/story-input/LongTextDetectionPrompt'
import StoryInputComposer, {
  type StorySelectionRange,
} from '@/components/story-input/StoryInputComposer'
import TaskStatusInline from '@/components/task/TaskStatusInline'
import { resolveTaskPresentationState } from '@/lib/task/presentation'
import { AppIcon } from '@/components/ui/icons'
import { PROJECT_STORY_INPUT_MIN_ROWS } from '@/lib/ui/textarea-height'
import { apiFetch } from '@/lib/api-fetch'
import { editHomeStorySelection, expandHomeStory } from '@/lib/home/ai-story-expand'
import type { AiStorySelectionMode } from '@/lib/story/ai-story-modes'
import { replaceTextRange } from '@/lib/story/replace-text-range'

/** 触发智能分集建议的字数阈值 */
const LONG_TEXT_THRESHOLD = 1000

interface NovelInputStageProps {
  novelText: string
  episodeName?: string
  onNovelTextChange: (value: string) => void
  onNext: () => void
  onSmartSplit?: (text: string) => void
  isSubmittingTask?: boolean
  isSwitchingStage?: boolean
  /** When true, primary CTA navigates to existing breakdown instead of regenerating. */
  hasExistingScript?: boolean
  /** Explicit rebuild path; should open confirm then re-run story→script. */
  onRebuildScript?: () => void
  enableNarration?: boolean
  onEnableNarrationChange?: (enabled: boolean) => void
  videoRatio?: string
  artStyle?: string
  genrePack?: string
  onVideoRatioChange?: (value: string) => void
  onArtStyleChange?: (value: string) => void
  onGenrePackChange?: (value: string) => void
}

export default function NovelInputStage({
  novelText,
  episodeName,
  onNovelTextChange,
  onNext,
  onSmartSplit,
  isSubmittingTask = false,
  isSwitchingStage = false,
  hasExistingScript = false,
  onRebuildScript,
  enableNarration = false,
  onEnableNarrationChange,
}: NovelInputStageProps) {
  const t = useTranslations('novelPromotion')
  const homeT = useTranslations('home')

  const isComposingRef = useRef(false)
  const [localText, setLocalText] = useState(novelText)
  const [aiWriteOpen, setAiWriteOpen] = useState(false)
  const [aiWriteLoading, setAiWriteLoading] = useState(false)
  const [selectionAiLoading, setSelectionAiLoading] = useState(false)
  const [showLongTextPrompt, setShowLongTextPrompt] = useState(false)

  useEffect(() => {
    if (!isComposingRef.current) {
      setLocalText(novelText)
    }
  }, [novelText])

  const handleCompositionStart = () => {
    isComposingRef.current = true
  }

  const handleCompositionEnd = (e: React.CompositionEvent<HTMLTextAreaElement>) => {
    isComposingRef.current = false
    onNovelTextChange(e.currentTarget.value)
  }

  const hasContent = localText.trim().length > 0
  const busy = isSubmittingTask || isSwitchingStage || aiWriteLoading || selectionAiLoading

  const applyText = useCallback((next: string) => {
    setLocalText(next)
    if (!isComposingRef.current) {
      onNovelTextChange(next)
    }
  }, [onNovelTextChange])

  const handleStartClick = useCallback(() => {
    if (hasExistingScript) {
      onNext()
      return
    }
    const textLength = localText.trim().length
    if (textLength > LONG_TEXT_THRESHOLD && onSmartSplit) {
      setShowLongTextPrompt(true)
    } else {
      onNext()
    }
  }, [hasExistingScript, localText, onNext, onSmartSplit])

  const handleAiWriteStart = useCallback(async (prompt: string) => {
    if (aiWriteLoading) return
    setAiWriteLoading(true)
    try {
      const result = await expandHomeStory({
        apiFetch,
        prompt,
      })

      applyText(result.expandedText)
      setAiWriteOpen(false)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed'
      window.alert(message)
    } finally {
      setAiWriteLoading(false)
    }
  }, [aiWriteLoading, applyText])

  const handleSelectionAi = useCallback(async (
    mode: AiStorySelectionMode,
    selection: StorySelectionRange,
  ) => {
    if (selectionAiLoading || busy) return
    const selectedText = selection.text.trim()
    if (!selectedText) return

    setSelectionAiLoading(true)
    try {
      const result = await editHomeStorySelection({
        apiFetch,
        mode,
        selectedText,
        fullText: localText,
      })
      const next = replaceTextRange(
        localText,
        selection.start,
        selection.end,
        result.expandedText,
      )
      applyText(next)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed'
      window.alert(message)
    } finally {
      setSelectionAiLoading(false)
    }
  }, [applyText, busy, localText, selectionAiLoading])

  const stageSwitchingState = isSwitchingStage
    ? resolveTaskPresentationState({
      phase: 'processing',
      intent: 'generate',
      resource: 'text',
      hasOutput: false,
    })
    : null

  const processCtaLabel = hasExistingScript
    ? t('smartImport.manualCreate.enterButton')
    : t('storyInput.processBar.cta')

  return (
    <div className="story-stage-shell">
      {episodeName ? (
        <div className="flex shrink-0 flex-wrap items-end justify-between gap-3 px-0.5">
          <div className="min-w-0">
            <div className="story-stage-title text-[1.35rem] font-semibold text-[var(--glass-text-primary)]">
              {t('storyInput.currentEditing', { name: episodeName })}
            </div>
            <div className="mt-1 text-[13px] leading-relaxed text-[var(--glass-text-tertiary)]">
              {t('storyInput.editingTip')}
            </div>
          </div>

          {onEnableNarrationChange ? (
            <div className="story-tip-card flex shrink-0 items-center gap-3 px-3 py-2">
              <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--glass-tone-info-bg)] text-[var(--glass-tone-info-fg)] text-[10px] font-semibold tracking-[0.04em]">
                VO
              </span>
              <div className="min-w-0">
                <div className="text-[12px] font-semibold tracking-[-0.01em] text-[var(--glass-text-primary)]">
                  {t('storyInput.narration.title')}
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={enableNarration}
                data-on={enableNarration ? 'true' : 'false'}
                onClick={() => onEnableNarrationChange(!enableNarration)}
                className={`apple-switch ${
                  enableNarration
                    ? 'bg-[var(--glass-accent-from)]'
                    : 'bg-[var(--glass-stroke-strong)]'
                }`}
              >
                <span className="apple-switch__knob" />
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="relative z-10 flex min-h-0 flex-1 flex-col gap-3">
        <StoryInputComposer
          value={localText}
          onValueChange={(value) => {
            setLocalText(value)
            if (!isComposingRef.current) {
              onNovelTextChange(value)
            }
          }}
          onCompositionStart={handleCompositionStart}
          onCompositionEnd={handleCompositionEnd}
          placeholder={t('storyInput.placeholder')}
          minRows={PROJECT_STORY_INPUT_MIN_ROWS}
          fillAvailableHeight
          showVisualControls={false}
          disabled={busy}
          textareaClassName="px-0 pt-0 pb-3 align-top"
          topLeft={(
            <span className="story-stage-chip">
              {t('storyInput.stageChip')}
            </span>
          )}
          topRight={(
            <button
              type="button"
              onClick={() => setAiWriteOpen(true)}
              disabled={busy}
              className="story-ai-write-ghost"
            >
              <AppIcon name="sparkles" className="h-3.5 w-3.5 text-[var(--film-gold)]" />
              <span>{t('storyInput.blankWrite')}</span>
            </button>
          )}
          selectionAi={{
            enabled: true,
            loading: selectionAiLoading,
            labels: {
              expand: t('storyInput.selectionAi.expand'),
              optimize: t('storyInput.selectionAi.optimize'),
              rewrite: t('storyInput.selectionAi.rewrite'),
              working: t('storyInput.selectionAi.working'),
            },
            onAction: (mode, selection) => {
              void handleSelectionAi(mode, selection)
            },
          }}
        />

        <div className="story-process-bar">
          <div className="story-process-bar__meta min-w-0">
            <h3 className="text-[13px] font-semibold tracking-[-0.01em] text-[var(--glass-text-primary)]">
              {t('storyInput.processBar.title')}
            </h3>
            <p className="mt-1 text-[12px] leading-relaxed text-[var(--glass-text-tertiary)]">
              {t('storyInput.processBar.description')}
            </p>
          </div>
          <div className="story-process-bar__cta">
            <div className="flex flex-wrap items-center justify-end gap-2">
              {hasExistingScript && onRebuildScript ? (
                <button
                  type="button"
                  onClick={() => onRebuildScript()}
                  disabled={!hasContent || busy}
                  className="glass-btn-base glass-btn-secondary flex h-10 flex-shrink-0 items-center gap-2 rounded-[11px] px-4 text-[13px] font-semibold tracking-[-0.01em]"
                >
                  <span>{t('smartImport.manualCreate.rebuildButton')}</span>
                </button>
              ) : null}
              <button
                type="button"
                onClick={handleStartClick}
                disabled={!hasContent || busy}
                className="glass-btn-base glass-btn-primary flex h-10 flex-shrink-0 items-center gap-2 rounded-[11px] px-5 text-[13px] font-semibold tracking-[-0.01em]"
              >
                {isSwitchingStage ? (
                  <TaskStatusInline
                    state={stageSwitchingState}
                    className="text-[var(--glass-text-on-accent)] [&>span]:text-[var(--glass-text-on-accent)] [&_svg]:text-[var(--glass-text-on-accent)]"
                  />
                ) : (
                  <>
                    <span>{processCtaLabel}</span>
                    <AppIcon name="arrowRight" className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
            <span className="text-[11px] text-[var(--glass-text-tertiary)]">
              {t('storyInput.processBar.hint')}
            </span>
          </div>
        </div>
      </div>

      <AiWriteModal
        open={aiWriteOpen}
        loading={aiWriteLoading}
        onClose={() => setAiWriteOpen(false)}
        onStart={(prompt) => void handleAiWriteStart(prompt)}
        t={(key: string) => homeT(`aiWrite.${key}`)}
      />

      <LongTextDetectionPrompt
        open={showLongTextPrompt}
        copy={{
          title: t('storyInput.longTextDetection.title'),
          description: t('storyInput.longTextDetection.description', {
            count: localText.trim().length.toLocaleString(),
          }),
          strongRecommend: t('storyInput.longTextDetection.strongRecommend'),
          smartSplitLabel: t('storyInput.longTextDetection.smartSplit'),
          smartSplitBadge: t('storyInput.longTextDetection.smartSplitRecommend'),
          continueLabel: t('storyInput.longTextDetection.continueAnyway'),
          continueHint: t('storyInput.longTextDetection.singleEpisodeWarning'),
        }}
        onClose={() => setShowLongTextPrompt(false)}
        onSmartSplit={() => {
          setShowLongTextPrompt(false)
          onSmartSplit?.(localText)
        }}
        onContinue={() => {
          setShowLongTextPrompt(false)
          onNext()
        }}
      />
    </div>
  )
}
