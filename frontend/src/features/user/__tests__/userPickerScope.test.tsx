import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

/**
 * TD-028: picker обязан ходить в проект, а поиск для приглашения — только по
 * точному совпадению. Оба запроса раньше уходили в один общий
 * `/users/picker`, отдававший всю базу пользователей вместе с email.
 */
const httpClient = vi.fn()

vi.mock('@/shared/api/workTechHttpClient', () => ({
  workTechApiClient: (args: unknown) => httpClient(args),
}))

import { useUserPicker } from '../useUserPicker'
import { useUserLookup } from '../useUserLookup'

function wrapper(client: QueryClient) {
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
}

async function settle() {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 50))
  })
}

describe('scope пользовательских выборок (TD-028)', () => {
  let client: QueryClient

  beforeEach(() => {
    httpClient.mockResolvedValue({ data: [] })
    client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  })

  afterEach(() => {
    vi.clearAllMocks()
    client.clear()
  })

  it('picker запрашивает участников конкретного проекта', async () => {
    renderHook(() => useUserPicker('ив', 'project-1'), { wrapper: wrapper(client) })

    await waitFor(() => expect(httpClient).toHaveBeenCalled())
    const url = httpClient.mock.calls[0][0].url as string
    expect(url).toContain('/users/picker')
    expect(url).toContain('projectId=project-1')
  })

  it('без проекта picker не отправляет запрос вовсе', async () => {
    renderHook(() => useUserPicker('ив', undefined), { wrapper: wrapper(client) })

    await settle()
    expect(httpClient).not.toHaveBeenCalled()
  })

  it('поиск для приглашения идёт в отдельный /users/lookup', async () => {
    renderHook(() => useUserLookup('ivanov', 'project-1'), { wrapper: wrapper(client) })

    await waitFor(() => expect(httpClient).toHaveBeenCalled())
    const url = httpClient.mock.calls[0][0].url as string
    expect(url).toContain('/users/lookup')
    expect(url).toContain('projectId=project-1')
    expect(url).toContain('q=ivanov')
  })

  it('одиночный символ не отправляется — перебирать базу по буквам нечем', async () => {
    renderHook(() => useUserLookup('и', 'project-1'), { wrapper: wrapper(client) })

    await settle()
    expect(httpClient).not.toHaveBeenCalled()
  })
})
