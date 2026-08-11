'use client'

import { ApiConfigTabContainer } from './api-config-tab/ApiConfigTabContainer'

interface ApiConfigTabProps {
  pane?: 'defaults' | 'providers'
}

export default function ApiConfigTab({ pane = 'defaults' }: ApiConfigTabProps) {
  return <ApiConfigTabContainer pane={pane} />
}
