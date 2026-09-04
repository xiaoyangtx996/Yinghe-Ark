'use client'

import { NextIntlClientProvider } from 'next-intl'
import type { AbstractIntlMessages, IntlError } from 'next-intl'

type IntlClientProviderProps = {
  locale: string
  messages: AbstractIntlMessages
  children: React.ReactNode
}

export function IntlClientProvider({ locale, messages, children }: IntlClientProviderProps) {
  return (
    <NextIntlClientProvider
      locale={locale}
      messages={messages}
      // Missing keys must not crash the whole workspace behind Next's error overlay.
      onError={(error: IntlError) => {
        if (error.code === 'MISSING_MESSAGE') {
          if (process.env.NODE_ENV !== 'production') {
            console.warn(error.message)
          }
          return
        }
        console.error(error)
      }}
      getMessageFallback={({ namespace, key }) => (namespace ? `${namespace}.${key}` : key)}
    >
      {children}
    </NextIntlClientProvider>
  )
}
