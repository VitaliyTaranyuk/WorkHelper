import { describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from '@tanstack/react-query'
import type { ReactNode } from 'react'

/**
 * ТП-239 — постоянный репродьюсер: удаление задачи не ждёт перерисовку списков.
 *
 * Дефект: `onSuccess` ВОЗВРАЩАЛ промис `invalidateQueries`, а react-query перед
 * резолвом `mutateAsync` дожидается промиса, возвращённого из onSuccess. Пока
 * доска перезагружалась, карточка оставалась открытой с заблокированной
 * кнопкой. Замер на проде: DELETE 2.5 с, рефетч ещё 6.5 с, закрытие через 9 с.
 *
 * Тест краснеет при откате фикса: `mutateAsync` не резолвится, пока рефетч
 * висит, и падает по таймауту.
 */

vi.mock('@/shared/api/endpoint', () => ({
  workTechApi: {
    task: { deleteTask: vi.fn(() => Promise.resolve({ data: {} })) },
  },
}))

import { useDeleteTask } from '../mutation/useDeleteTask'

describe('ТП-239: удаление задачи не ждёт рефетч списков', () => {
  it('mutateAsync резолвится, пока инвалидация ещё грузит доску', async () => {
    let fetchCount = 0
    let releaseRefetch: (() => void) | undefined
    const queryFn = () => {
      fetchCount += 1
      if (fetchCount === 1) return Promise.resolve(['первая загрузка'])
      // Рефетч после инвалидации — «висит», пока тест его не отпустит
      return new Promise<string[]>((resolve) => {
        releaseRefetch = () => resolve(['после удаления'])
      })
    }

    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })
    function wrapper({ children }: { children: ReactNode }) {
      return <QueryClientProvider client={client}>{children}</QueryClientProvider>
    }

    const { result } = renderHook(
      () => ({
        board: useQuery({ queryKey: ['tasks', 'p-1', 'board'], queryFn }),
        remove: useDeleteTask(),
      }),
      { wrapper },
    )

    await waitFor(() => expect(result.current.board.isSuccess).toBe(true))

    await result.current.remove.mutateAsync({ projectId: 'p-1', taskId: 't-1' })

    // Ключевой инвариант: удаление завершено, хотя рефетч ещё в полёте
    expect(fetchCount).toBe(2)
    expect(releaseRefetch).toBeTypeOf('function')
    releaseRefetch!()
    await waitFor(() =>
      expect(result.current.board.data).toEqual(['после удаления']),
    )
  })
})
