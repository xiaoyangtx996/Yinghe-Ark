/**
 * Voice lines reference panels without onDelete SetNull.
 * Clear soft matches before deleting panels/storyboards/clips.
 */

type VoiceMatchTx = {
  novelPromotionVoiceLine: {
    updateMany: (args: {
      where: Record<string, unknown>
      data: {
        matchedPanelId: null
        matchedStoryboardId: null
        matchedPanelIndex: null
      }
    }) => Promise<unknown>
  }
}

export async function clearVoiceLineMatchesForStoryboard(
  tx: VoiceMatchTx,
  storyboard: { id: string; panels: Array<{ id: string }> },
): Promise<void> {
  const panelIds = storyboard.panels.map((panel) => panel.id)
  const orFilters: Array<Record<string, unknown>> = [
    { matchedStoryboardId: storyboard.id },
  ]
  if (panelIds.length > 0) {
    orFilters.push({ matchedPanelId: { in: panelIds } })
  }

  await tx.novelPromotionVoiceLine.updateMany({
    where: { OR: orFilters },
    data: {
      matchedPanelId: null,
      matchedStoryboardId: null,
      matchedPanelIndex: null,
    },
  })
}
