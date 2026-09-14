/**
 * Approximate caret (or selection end) coordinates inside a textarea
 * via a mirrored offscreen div. Returns coords relative to the textarea.
 */
export function getTextareaCaretPosition(
  element: HTMLTextAreaElement,
  position: number,
): { top: number; left: number; height: number } {
  const style = window.getComputedStyle(element)
  const mirror = document.createElement('div')
  const properties = [
    'boxSizing',
    'width',
    'height',
    'overflowX',
    'overflowY',
    'borderTopWidth',
    'borderRightWidth',
    'borderBottomWidth',
    'borderLeftWidth',
    'paddingTop',
    'paddingRight',
    'paddingBottom',
    'paddingLeft',
    'fontStyle',
    'fontVariant',
    'fontWeight',
    'fontStretch',
    'fontSize',
    'fontSizeAdjust',
    'lineHeight',
    'fontFamily',
    'textAlign',
    'textTransform',
    'textIndent',
    'textDecoration',
    'letterSpacing',
    'wordSpacing',
    'tabSize',
    'whiteSpace',
    'wordBreak',
    'overflowWrap',
  ] as const

  mirror.setAttribute('aria-hidden', 'true')
  mirror.style.position = 'absolute'
  mirror.style.visibility = 'hidden'
  mirror.style.whiteSpace = 'pre-wrap'
  mirror.style.wordWrap = 'break-word'
  mirror.style.top = '0'
  mirror.style.left = '-9999px'

  for (const prop of properties) {
    mirror.style[prop] = style[prop]
  }

  mirror.style.width = `${element.clientWidth}px`
  mirror.style.height = 'auto'
  mirror.style.overflow = 'hidden'

  const value = element.value
  const before = value.slice(0, position)
  mirror.textContent = before

  const marker = document.createElement('span')
  marker.textContent = value.slice(position, position + 1) || '.'
  mirror.appendChild(marker)
  document.body.appendChild(mirror)

  const top = marker.offsetTop - element.scrollTop
  const left = marker.offsetLeft - element.scrollLeft
  const height = marker.offsetHeight || Number.parseFloat(style.lineHeight) || 20

  document.body.removeChild(mirror)

  return { top, left, height }
}
