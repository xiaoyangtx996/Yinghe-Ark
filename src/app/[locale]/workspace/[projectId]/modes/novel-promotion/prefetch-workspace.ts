/** Prefetch helper colocated so the dynamic import path has no route brackets. */
export function prefetchNovelPromotionWorkspaceChunk() {
  return import('./NovelPromotionWorkspace')
}
