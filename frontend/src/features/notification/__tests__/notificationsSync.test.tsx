import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import type { NotificationDto } from '@/shared/api/endpoint/notificationsApi'

/**
 * ТП-184: бейдж и список — один источник истины. Раньше рассинхронивались
 * («счётчик 0, а в списке непрочитанные»). Тесты фиксируют: бейдж —
 * производное от списка; пометка прочитанным оптимистична, бейдж и вид
 * элемента меняются согласованно и мгновенно.
 */

// Серверное состояние — мутации его меняют, getNotifications отражает.
let server: NotificationDto[] = []
function resetServer() {
  server = [
    { id: 'n1', type: 'MENTION', message: 'm1', read: false } as NotificationDto,
    { id: 'n2', type: 'MENTION', message: 'm2', read: false } as NotificationDto,
    { id: 'n3', type: 'MENTION', message: 'm3', read: true } as NotificationDto,
  ]
}

const getNotifications = vi.fn()
const markRead = vi.fn()
const markAllRead = vi.fn()

vi.mock('@/shared/api/endpoint', () => ({
  workTechApi: {
    notification: {
      getNotifications: () => getNotifications(),
      markRead: (args: { id: string }) => markRead(args),
      markAllRead: () => markAllRead(),
    },
  },
}))

import {
  useMarkAllRead,
  useMarkRead,
  useNotifications,
  useUnreadCount,
} from '../useNotifications'

function wrapper(client: QueryClient) {
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
}

describe('ТП-184: синхронизация бейджа и списка', () => {
  let client: QueryClient
  beforeEach(() => {
    resetServer()
    getNotifications.mockImplementation(() =>
      Promise.resolve({ data: server.map((n) => ({ ...n })) }),
    )
    markRead.mockImplementation(({ id }: { id: string }) => {
      server = server.map((n) => (n.id === id ? { ...n, read: true } : n))
      return Promise.resolve({})
    })
    markAllRead.mockImplementation(() => {
      server = server.map((n) => ({ ...n, read: true }))
      return Promise.resolve({})
    })
    client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })
  })
  afterEach(() => {
    vi.clearAllMocks()
    client.clear()
  })

  it('бейдж вычисляется из непрочитанных элементов списка (не отдельный счётчик)', async () => {
    const { result } = renderHook(() => useUnreadCount(), {
      wrapper: wrapper(client),
    })
    await waitFor(() => expect(result.current.data).toBe(2))
  })

  it('оптимистичная пометка: бейдж −1 и элемент read=true согласованно, мгновенно', async () => {
    const badge = renderHook(() => useUnreadCount(), { wrapper: wrapper(client) })
    const listHook = renderHook(() => useNotifications(), {
      wrapper: wrapper(client),
    })
    const mark = renderHook(() => useMarkRead(), { wrapper: wrapper(client) })

    await waitFor(() => expect(badge.result.current.data).toBe(2))

    await act(async () => {
      mark.result.current.mutate('n1')
    })

    // Бейдж и элемент меняются в одном кадре кэша — без ожидания сети
    await waitFor(() => {
      expect(badge.result.current.data).toBe(1)
      const n1 = listHook.result.current.data?.find((n) => n.id === 'n1')
      expect(n1?.read).toBe(true)
    })
    // Нет ситуации «бейдж уменьшился, а список остался непрочитанным»
    const unreadInList =
      listHook.result.current.data?.filter((n) => !n.read).length
    expect(unreadInList).toBe(badge.result.current.data)
  })

  it('пометка всех: бейдж обнуляется, все элементы read', async () => {
    const badge = renderHook(() => useUnreadCount(), { wrapper: wrapper(client) })
    const listHook = renderHook(() => useNotifications(), {
      wrapper: wrapper(client),
    })
    const markAll = renderHook(() => useMarkAllRead(), {
      wrapper: wrapper(client),
    })
    await waitFor(() => expect(badge.result.current.data).toBe(2))

    await act(async () => {
      markAll.result.current.mutate()
    })

    await waitFor(() => {
      expect(badge.result.current.data).toBe(0)
      expect(listHook.result.current.data?.every((n) => n.read)).toBe(true)
    })
  })

  it('сбой пометки — откат: бейдж и список возвращаются в прежнее согласованное состояние', async () => {
    markRead.mockImplementationOnce(() => Promise.reject(new Error('network')))
    const badge = renderHook(() => useUnreadCount(), { wrapper: wrapper(client) })
    const mark = renderHook(() => useMarkRead(), { wrapper: wrapper(client) })
    await waitFor(() => expect(badge.result.current.data).toBe(2))

    await act(async () => {
      mark.result.current.mutate('n1')
    })

    // после отката (и повторной загрузки в onSettled) — снова 2 непрочитанных
    await waitFor(() => expect(badge.result.current.data).toBe(2))
  })
})
