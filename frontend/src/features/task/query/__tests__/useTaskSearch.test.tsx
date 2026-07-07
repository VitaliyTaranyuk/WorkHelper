import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

/**
 * ТП-188: серверный поиск для описаний — дебаунс, порог 2 символа,
 * множество id совпадений.
 */
const searchTasks = vi.fn()

vi.mock('@/shared/api/endpoint', () => ({
  workTechApi: { task: { searchTasks: (a: unknown) => searchTasks(a) } },
}))

import { useTaskSearch } from '../useTaskSearch'

function wrapper(client: QueryClient) {
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
}

describe('useTaskSearch (ТП-188)', () => {
  let client: QueryClient
  beforeEach(() => {
    searchTasks.mockResolvedValue({ data: ['t-1', 't-2'] })
    client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  })
  afterEach(() => {
    vi.clearAllMocks()
    client.clear()
  })

  it('запрос короче 2 символов — не ищет', async () => {
    renderHook(() => useTaskSearch('p1', 'a'), { wrapper: wrapper(client) })
    await act(async () => {
      await new Promise((r) => setTimeout(r, 400))
    })
    expect(searchTasks).not.toHaveBeenCalled()
  })

  it('дебаунсит и возвращает множество id совпадений', async () => {
    const { result } = renderHook(() => useTaskSearch('p1', 'оплата'), {
      wrapper: wrapper(client),
    })
    // до окончания дебаунса запрос не ушёл
    expect(searchTasks).not.toHaveBeenCalled()
    await waitFor(() =>
      expect(searchTasks).toHaveBeenCalledWith({ projectId: 'p1', q: 'оплата' }),
    )
    await waitFor(() => expect(result.current.matchedIds).toEqual(['t-1', 't-2']))
  })
})
