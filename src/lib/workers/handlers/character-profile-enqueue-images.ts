import type { Locale } from '@/i18n/routing'
import { buildDefaultTaskBillingInfo } from '@/lib/billing'
import { buildImageBillingPayload, getProjectModelConfig } from '@/lib/config-service'
import { normalizeImageGenerationCount } from '@/lib/image-generation/count'
import { createScopedLogger } from '@/lib/logging/core'
import { hasCharacterAppearanceOutput } from '@/lib/task/has-output'
import { submitTask } from '@/lib/task/submitter'
import { TASK_TYPE } from '@/lib/task/types'
import { withTaskUiPayload } from '@/lib/task/ui-payload'

/**
 * After profile confirm creates empty appearances, enqueue IMAGE_CHARACTER
 * so "确认并生成" actually starts image generation (not only visual text).
 */
export async function enqueueProjectCharacterAppearanceImages(input: {
  userId: string
  projectId: string
  locale: Locale
  characterId: string
  appearanceIds: string[]
  count?: number
  requestId?: string | null
}): Promise<{ submitted: number; skipped: number; errors: string[] }> {
  const logger = createScopedLogger({
    module: 'worker.character-profile',
    action: 'enqueue_appearance_images',
    requestId: input.requestId || undefined,
    projectId: input.projectId,
    userId: input.userId,
  })

  const appearanceIds = input.appearanceIds.map((id) => id.trim()).filter(Boolean)
  if (appearanceIds.length === 0) {
    return { submitted: 0, skipped: 0, errors: [] }
  }

  const projectModelConfig = await getProjectModelConfig(input.projectId, input.userId)
  const imageModel = projectModelConfig.characterModel
  if (!imageModel) {
    const message = 'Character model not configured; skip auto image enqueue'
    logger.warn({ message, details: { characterId: input.characterId } })
    return { submitted: 0, skipped: appearanceIds.length, errors: [message] }
  }

  const count = normalizeImageGenerationCount('character', input.count ?? 1)
  let submitted = 0
  let skipped = 0
  const errors: string[] = []

  for (const appearanceId of appearanceIds) {
    try {
      const hasOutputAtStart = await hasCharacterAppearanceOutput({
        appearanceId,
        characterId: input.characterId,
      })
      if (hasOutputAtStart) {
        skipped += 1
        continue
      }

      const payloadBase = {
        type: 'character',
        id: input.characterId,
        appearanceId,
        count,
      }
      const billingPayload = await buildImageBillingPayload({
        projectId: input.projectId,
        userId: input.userId,
        imageModel,
        basePayload: payloadBase,
      })

      await submitTask({
        userId: input.userId,
        locale: input.locale,
        requestId: input.requestId,
        projectId: input.projectId,
        type: TASK_TYPE.IMAGE_CHARACTER,
        targetType: 'CharacterAppearance',
        targetId: appearanceId,
        payload: withTaskUiPayload(billingPayload, { hasOutputAtStart }),
        dedupeKey: `${TASK_TYPE.IMAGE_CHARACTER}:${appearanceId}:${count}`,
        billingInfo: buildDefaultTaskBillingInfo(TASK_TYPE.IMAGE_CHARACTER, billingPayload),
      })
      submitted += 1
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error)
      errors.push(`${appearanceId}: ${message}`)
      logger.warn({
        message: 'Failed to enqueue character appearance image',
        details: { characterId: input.characterId, appearanceId, error: message },
      })
    }
  }

  return { submitted, skipped, errors }
}
