/**
 * Client-side novel file readers (.txt / .docx).
 * Parsing uses local algorithms only — no AI.
 */

import mammoth from 'mammoth'

/** Soft cap on raw file bytes only (browser memory safety), not novel word count. */
const MAX_FILE_BYTES = 50 * 1024 * 1024

export type NovelFileReadResult = {
  text: string
  fileName: string
}

function normalizeNovelText(raw: string): string {
  return raw.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').trim()
}

export function isSupportedNovelFile(file: File): boolean {
  const name = file.name.toLowerCase()
  return (
    name.endsWith('.txt') ||
    name.endsWith('.docx') ||
    file.type === 'text/plain' ||
    file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  )
}

export async function readNovelFile(file: File): Promise<NovelFileReadResult> {
  const lower = file.name.toLowerCase()
  if (lower.endsWith('.doc') && !lower.endsWith('.docx')) {
    throw new Error('DOC_NOT_SUPPORTED')
  }

  if (!isSupportedNovelFile(file)) {
    throw new Error('UNSUPPORTED_FORMAT')
  }

  if (file.size > MAX_FILE_BYTES) {
    throw new Error('TOO_LARGE')
  }

  let text = ''

  if (lower.endsWith('.docx') || file.type.includes('wordprocessingml')) {
    const buffer = await file.arrayBuffer()
    const result = await mammoth.extractRawText({ arrayBuffer: buffer })
    text = normalizeNovelText(result.value || '')
  } else {
    text = normalizeNovelText(await file.text())
  }

  if (!text) {
    throw new Error('EMPTY_FILE')
  }

  return { text, fileName: file.name }
}
