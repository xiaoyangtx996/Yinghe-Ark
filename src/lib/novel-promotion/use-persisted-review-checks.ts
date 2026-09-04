'use client'

import { useCallback, useEffect, useState } from 'react'

/**
 * Persist checklist checked ids keyed by storageKey.
 * Only writes after the current key has been loaded (hydratedKey === storageKey),
 * so switching episode/project cannot overwrite the next key with the previous checks.
 */
export function usePersistedReviewChecks<T extends string>(
  storageKey: string,
  parseStored: (raw: string | null) => T[],
): [T[], (updater: T[] | ((prev: T[]) => T[])) => void] {
  const [checkedIds, setCheckedIds] = useState<T[]>([])
  const [hydratedKey, setHydratedKey] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    setHydratedKey(null)
    setCheckedIds(parseStored(window.localStorage.getItem(storageKey)))
    setHydratedKey(storageKey)
  }, [parseStored, storageKey])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (hydratedKey !== storageKey) return
    window.localStorage.setItem(storageKey, JSON.stringify(checkedIds))
  }, [checkedIds, hydratedKey, storageKey])

  const setChecked = useCallback((updater: T[] | ((prev: T[]) => T[])) => {
    setCheckedIds(updater)
  }, [])

  return [checkedIds, setChecked]
}
