import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

/**
 * Ретраи имеют смысл только для временных сбоев (сеть, 5xx).
 * Клиентские ошибки (4xx) детерминированы: повтор даст тот же ответ —
 * 404 по удалённой задаче ретраился 3 раза и лишь откладывал ошибку UI.
 */
export function shouldRetryQuery(failureCount: number, error: unknown): boolean {
  const status = (error as { response?: { status?: number } })?.response?.status
  if (status !== undefined && status >= 400 && status < 500) return false
  return failureCount < 3
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: shouldRetryQuery,
      // Свежесть данных обеспечивают поллинг (ТП-47) и invalidateQueries
      // после мутаций; ненулевой staleTime убирает шторм повторных GET
      // при каждой навигации (projects/for-user, project/{id} и т.п.).
      staleTime: 15_000,
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
