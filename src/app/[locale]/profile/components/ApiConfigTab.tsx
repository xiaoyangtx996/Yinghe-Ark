'use client'

import { ApiConfigTabContainer } from './api-config-tab/ApiConfigTabContainer'

interface ApiConfigTabProps {
  pane?: 'defaults' | 'providers'
  addProviderOpen?: boolean
  onAddProviderOpenChange?: (open: boolean) => void
}

export default function ApiConfigTab({
  pane = 'defaults',
  addProviderOpen,
  onAddProviderOpenChange,
}: ApiConfigTabProps) {
  return (
    <ApiConfigTabContainer
      pane={pane}
      addProviderOpen={addProviderOpen}
      onAddProviderOpenChange={onAddProviderOpenChange}
    />
  )
}
