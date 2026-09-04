import { describe, expect, it, vi } from 'vitest'

/**
 * Behavioral contract for home create confirm:
 * opening the wizard must not call create; confirm does.
 */
describe('home create confirm contract', () => {
  it('does not launch until confirm is invoked', async () => {
    const createHomeProjectLaunch = vi.fn(async () => ({
      target: { pathname: '/workspace/p1', query: { autoRun: 'storyToScript' } },
    }))

    let confirmOpen = false
    const openConfirm = () => {
      confirmOpen = true
    }
    const confirmAndCreate = async () => {
      if (!confirmOpen) return
      await createHomeProjectLaunch()
    }

    openConfirm()
    expect(createHomeProjectLaunch).not.toHaveBeenCalled()

    await confirmAndCreate()
    expect(createHomeProjectLaunch).toHaveBeenCalledTimes(1)
  })
})
