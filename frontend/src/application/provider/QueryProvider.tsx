import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // при 401 после неудачного refresh можно отключить ретраи
      retry: (failureCount, error) => {
        console.log({ error })

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const status = (error as any)?.response?.status
        if (status === 401) return false
        return failureCount < 3
      },
    },
  },
})

interface ProviderProps {
  children: React.ReactNode
}

export const QueryProvider: React.FC<ProviderProps> = ({ children }) => {
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}
