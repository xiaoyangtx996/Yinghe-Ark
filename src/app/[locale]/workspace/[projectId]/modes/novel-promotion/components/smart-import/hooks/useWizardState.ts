'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { logInfo as _ulogInfo, logWarn as _ulogWarn, logError as _ulogError } from '@/lib/logging/core'
import {
  detectEpisodeMarkers,
  stripLeadingChapterHeading,
  type EpisodeMarkerResult,
} from '@/lib/episode-marker-detector'
import { countWords } from '@/lib/word-count'
import {
  useListProjectEpisodes,
  useSaveProjectEpisodesBatch,
  useSplitProjectEpisodesByMarkers,
} from '@/lib/query/hooks'
import { readNovelFile } from '../read-novel-file'
import type { DeleteConfirmState, SplitEpisode, WizardStage } from '../types'

type TranslateValues = Record<string, string | number | Date>
type Translate = (key: string, values?: TranslateValues) => string

interface UseWizardStateParams {
  projectId: string
  importStatus?: string | null
  onImportComplete: (episodes: SplitEpisode[]) => void
  t: Translate
  /** 预填文本：传入后自动走本地章节标记分集 */
  initialRawContent?: string
}

function renumberEpisodeTitles(episodes: SplitEpisode[], startNumber: number): SplitEpisode[] {
  return episodes.map((ep, idx) => {
    const number = startNumber + idx
    const title = ep.title.replace(/^第\s*\d+\s*集/, `第 ${number} 集`)
    return { ...ep, number, title: title.startsWith('第') ? title : `第 ${number} 集：${ep.title}` }
  })
}

export function useWizardState({ projectId, importStatus, onImportComplete, t, initialRawContent }: UseWizardStateParams) {
  const initialStage: WizardStage = importStatus === 'pending' ? 'preview' : 'select'
  const [stage, setStage] = useState<WizardStage>(initialStage)
  const [rawContent, setRawContent] = useState(initialRawContent || '')
  const [fileName, setFileName] = useState<string | null>(null)
  const [episodes, setEpisodes] = useState<SplitEpisode[]>([])
  const [selectedEpisode, setSelectedEpisode] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirmState>({ show: false, index: -1, title: '' })
  const [markerResult, setMarkerResult] = useState<EpisodeMarkerResult | null>(null)
  const [saving, setSaving] = useState(false)
  const [importing, setImporting] = useState(false)
  /** 继续导入：下一次分集追加到已有剧集，不覆盖 */
  const [appendNext, setAppendNext] = useState(false)
  /** 预览阶段是否已成功写入 DB（勿在失败时仍显示「已自动保存」） */
  const [autoSaved, setAutoSaved] = useState(false)

  const listProjectEpisodesMutation = useListProjectEpisodes(projectId)
  const splitProjectEpisodesByMarkersMutation = useSplitProjectEpisodesByMarkers(projectId)
  const saveProjectEpisodesBatchMutation = useSaveProjectEpisodesBatch(projectId)

  const mapLoadedEpisodes = useCallback((raw: Array<{ episodeNumber?: number; name?: string; description?: string; novelText?: string }>) => {
    return raw.map((ep, idx) => {
      const content = stripLeadingChapterHeading(ep.novelText || '')
      return {
        number: ep.episodeNumber || idx + 1,
        title: ep.name || t('episode', { num: idx + 1 }),
        summary: ep.description || '',
        content,
        wordCount: countWords(content),
      } satisfies SplitEpisode
    })
  }, [t])

  const loadSavedEpisodes = useCallback(async () => {
    try {
      const data = await listProjectEpisodesMutation.mutateAsync()
      if (data.episodes && data.episodes.length > 0) {
        setEpisodes(mapLoadedEpisodes(data.episodes))
        setAutoSaved(true)
        setStage('preview')
      }
    } catch (err) {
      _ulogError('[SmartImport] 加载已保存剧集失败:', err)
    }
  }, [listProjectEpisodesMutation, mapLoadedEpisodes])

  useEffect(() => {
    if (importStatus === 'pending' && episodes.length === 0) {
      void loadSavedEpisodes()
    }
  }, [episodes.length, importStatus, loadSavedEpisodes])

  const persistEpisodes = useCallback(async (
    nextEpisodes: SplitEpisode[],
    options: { clearExisting: boolean; importStatus: 'pending' | 'completed' },
  ) => {
    await saveProjectEpisodesBatchMutation.mutateAsync({
      episodes: nextEpisodes.map((ep) => ({
        name: ep.title,
        description: ep.summary,
        novelText: ep.content,
      })),
      clearExisting: options.clearExisting,
      importStatus: options.importStatus,
    })
  }, [saveProjectEpisodesBatchMutation])

  const runMarkerSplit = useCallback(async (content: string, detection?: EpisodeMarkerResult) => {
    const markerDetection = detection ?? detectEpisodeMarkers(content)

    if (!markerDetection.hasMarkers || markerDetection.matches.length < 2) {
      setError(t('errors.noMarkers'))
      setStage('select')
      return
    }

    setMarkerResult(markerDetection)
    setStage('analyzing')
    setError(null)

    const shouldAppend = appendNext

    try {
      _ulogInfo('[SmartImport] 本地章节标记分集', {
        markerType: markerDetection.markerType,
        matchCount: markerDetection.matches.length,
        append: shouldAppend,
      })

      const data = await splitProjectEpisodesByMarkersMutation.mutateAsync({ content })
      let splitEpisodes: SplitEpisode[] = data.episodes || []

      if (shouldAppend) {
        const existingCount = episodes.length
        splitEpisodes = renumberEpisodeTitles(splitEpisodes, existingCount + 1)
        try {
          await persistEpisodes(splitEpisodes, { clearExisting: false, importStatus: 'pending' })
          _ulogInfo('[SmartImport] 追加分集已保存', { added: splitEpisodes.length, base: existingCount })
          const listed = await listProjectEpisodesMutation.mutateAsync()
          const all = mapLoadedEpisodes(listed.episodes || [])
          setEpisodes(all)
          setSelectedEpisode(Math.max(0, existingCount))
          setAutoSaved(true)
          setError(null)
        } catch (err) {
          _ulogWarn('[SmartImport] 追加保存失败，仅展示本批预览', err)
          setEpisodes((prev) => [...prev, ...splitEpisodes])
          setSelectedEpisode(Math.max(0, episodes.length))
          setAutoSaved(false)
          const message = err instanceof Error ? err.message : t('errors.saveFailed')
          setError(message || t('errors.saveFailed'))
        }
      } else {
        setEpisodes(splitEpisodes)
        setSelectedEpisode(0)
        try {
          await persistEpisodes(splitEpisodes, { clearExisting: true, importStatus: 'pending' })
          _ulogInfo('[SmartImport] 标记分集已保存（覆盖）')
          setAutoSaved(true)
          setError(null)
        } catch (err) {
          _ulogWarn('[SmartImport] 标记分割保存失败，继续显示预览', err)
          setAutoSaved(false)
          const message = err instanceof Error ? err.message : t('errors.saveFailed')
          setError(message || t('errors.saveFailed'))
        }
      }

      setAppendNext(false)
      setStage('preview')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('errors.splitFailed')
      setError(message || t('errors.splitFailed'))
      setStage('select')
    }
  }, [
    appendNext,
    episodes.length,
    listProjectEpisodesMutation,
    mapLoadedEpisodes,
    persistEpisodes,
    splitProjectEpisodesByMarkersMutation,
    t,
  ])

  const handleImportFile = useCallback(async (file: File) => {
    setImporting(true)
    setError(null)

    try {
      const { text, fileName: name } = await readNovelFile(file)
      setRawContent(text)
      setFileName(name)
      setMarkerResult(null)
    } catch (err: unknown) {
      const code = err instanceof Error ? err.message : ''
      if (code === 'UNSUPPORTED_FORMAT') {
        setError(t('errors.unsupportedFormat'))
      } else if (code === 'DOC_NOT_SUPPORTED') {
        setError(t('errors.docNotSupported'))
      } else if (code === 'EMPTY_FILE') {
        setError(t('errors.fileEmpty'))
      } else if (code === 'TOO_LARGE') {
        setError(t('errors.fileTooLarge'))
      } else {
        setError(t('errors.fileReadError'))
      }
    } finally {
      setImporting(false)
    }
  }, [t])

  const handleSplitCurrentContent = useCallback(async () => {
    if (!rawContent.trim()) {
      setError(t('errors.uploadFirst'))
      return
    }
    await runMarkerSplit(rawContent)
  }, [rawContent, runMarkerSplit, t])

  const clearImportedFile = useCallback(() => {
    setRawContent('')
    setFileName(null)
    setMarkerResult(null)
    setError(null)
  }, [])

  /** 重新导入：清空本地文件，下次分集覆盖已有结果 */
  const handleReimport = useCallback(() => {
    setAppendNext(false)
    setAutoSaved(false)
    clearImportedFile()
    setStage('select')
  }, [clearImportedFile])

  /** 继续导入：先落盘当前编辑，再回到上传页，下次分集追加 */
  const handleContinueImport = useCallback(async () => {
    setSaving(true)
    setError(null)
    try {
      if (episodes.length > 0) {
        await persistEpisodes(episodes, { clearExisting: true, importStatus: 'pending' })
        setAutoSaved(true)
      }
      setAppendNext(true)
      clearImportedFile()
      setStage('select')
    } catch (err: unknown) {
      _ulogError('[SmartImport] 继续导入前保存失败:', err)
      setAutoSaved(false)
      const message = err instanceof Error ? err.message : t('errors.saveFailed')
      setError(message || t('errors.saveFailed'))
    } finally {
      setSaving(false)
    }
  }, [clearImportedFile, episodes, persistEpisodes, t])

  // 预填文本：自动走本地章节分集（非 AI）
  const autoSplitTriggered = useRef(false)
  useEffect(() => {
    if (initialRawContent && !autoSplitTriggered.current && stage === 'select') {
      autoSplitTriggered.current = true
      void runMarkerSplit(initialRawContent)
    }
  }) // eslint-disable-line react-hooks/exhaustive-deps

  const updateEpisodeTitle = useCallback((index: number, title: string) => {
    setEpisodes((prev) => prev.map((ep, i) => (i === index ? { ...ep, title } : ep)))
  }, [])

  const updateEpisodeSummary = useCallback((index: number, summary: string) => {
    setEpisodes((prev) => prev.map((ep, i) => (i === index ? { ...ep, summary } : ep)))
  }, [])

  const updateEpisodeNumber = useCallback((index: number, number: number) => {
    setEpisodes((prev) => prev.map((ep, i) => (i === index ? { ...ep, number } : ep)))
  }, [])

  const updateEpisodeContent = useCallback((index: number, content: string) => {
    setEpisodes((prev) => prev.map((ep, i) => (i === index ? { ...ep, content, wordCount: countWords(content) } : ep)))
  }, [])

  const deleteEpisode = useCallback((index: number) => {
    setEpisodes((prev) => {
      if (prev.length <= 1) return prev
      const next = prev.filter((_, i) => i !== index)
      setSelectedEpisode((current) => (current >= next.length ? Math.max(0, next.length - 1) : current))
      return next
    })
  }, [])

  const addEpisode = useCallback(() => {
    setEpisodes((prev) => {
      const newEpisode: SplitEpisode = {
        number: prev.length + 1,
        title: `第 ${prev.length + 1} 集`,
        summary: '',
        content: '',
        wordCount: 0,
      }
      const next = [...prev, newEpisode]
      setSelectedEpisode(next.length - 1)
      return next
    })
  }, [])

  const openDeleteConfirm = useCallback((index: number, title: string) => {
    setDeleteConfirm({ show: true, index, title })
  }, [])

  const closeDeleteConfirm = useCallback(() => {
    setDeleteConfirm({ show: false, index: -1, title: '' })
  }, [])

  const confirmDeleteEpisode = useCallback(() => {
    if (deleteConfirm.index >= 0) {
      deleteEpisode(deleteConfirm.index)
    }
    closeDeleteConfirm()
  }, [closeDeleteConfirm, deleteConfirm.index, deleteEpisode])

  /** 确认完成：写入最终编辑结果，标记 importStatus=completed，刷新侧栏 */
  const handleConfirm = useCallback(async () => {
    if (episodes.length === 0) {
      setError(t('errors.saveFailed'))
      return
    }

    setSaving(true)
    setError(null)

    try {
      await persistEpisodes(episodes, { clearExisting: true, importStatus: 'completed' })
      _ulogInfo('[SmartImport] 剧集已确认保存', { count: episodes.length })
      setAutoSaved(true)
      onImportComplete(episodes)
    } catch (err: unknown) {
      _ulogError('[SmartImport] 确认保存失败:', err)
      const message = err instanceof Error ? err.message : t('errors.saveFailed')
      setError(message || t('errors.saveFailed'))
    } finally {
      setSaving(false)
    }
  }, [episodes, onImportComplete, persistEpisodes, t])

  return {
    stage,
    setStage,
    rawContent,
    fileName,
    episodes,
    selectedEpisode,
    setSelectedEpisode,
    error,
    saving,
    importing,
    markerResult,
    deleteConfirm,
    appendNext,
    autoSaved,
    handleImportFile,
    handleSplitCurrentContent,
    clearImportedFile,
    handleReimport,
    handleContinueImport,
    updateEpisodeTitle,
    updateEpisodeSummary,
    updateEpisodeNumber,
    updateEpisodeContent,
    addEpisode,
    openDeleteConfirm,
    closeDeleteConfirm,
    confirmDeleteEpisode,
    handleConfirm,
  }
}
