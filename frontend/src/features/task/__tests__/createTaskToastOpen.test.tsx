import { describe, expect, it, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

/**
 * ТП-195 — постоянный репродьюсер: тост «Создана задача» → кнопка «Открыть»
 * обязана открывать ТУ ЖЕ модальную карточку, что и клик с доски/списка,
 * а НЕ уводить на полную страницу /task/$code.
 *
 * Дефект уходил в прод дважды (последний раз — при первом заходе на ТП-195,
 * когда исправили смежное поведение, а саму точку входа пропустили), поэтому
 * тест закрепляет контракт: `router.navigate` из этого пути НЕ вызывается,
 * вызывается `NiceModal.show` с кодом созданной задачи.
 */

const navigateSpy = vi.fn()
const showSpy =
  vi.fn<(comp: unknown, args: { taskCode?: string }) => Promise<void>>(() =>
    Promise.resolve(),
  )

vi.mock('@/application/router', () => ({
  router: { navigate: navigateSpy },
}))

vi.mock('@ebay/nice-modal-react', () => ({
  default: {
    show: (comp: unknown, args: { taskCode?: string }) => showSpy(comp, args),
  },
}))

// Карточка подгружается динамическим импортом (разрыв цикла зависимостей) —
// подменяем заглушкой, чтобы тест не тянул всё дерево карточки.
vi.mock('@/widget/modal/task/TaskCardModal', () => ({
  TaskCardModal: 'TaskCardModalStub',
}))

vi.mock('@/shared/api/endpoint', () => ({
  workTechApi: {
    task: {
      createTask: vi.fn(() =>
        Promise.resolve({ data: { id: 't-1', code: 'ТП-1', title: 'Задача' } }),
      ),
    },
  },
}))

// Тост не рендерим — перехватываем action, чтобы «нажать» на него в тесте.
let capturedAction: { label: string; onClick: () => void } | undefined
vi.mock('@/shared/ui/notify', () => ({
  notify: {
    success: (_msg: string, opts?: { action?: { label: string; onClick: () => void } }) => {
      capturedAction = opts?.action
    },
  },
}))

import { useCreateTask } from '../mutation/useCreateTask'

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

describe('ТП-195: «Открыть» в тосте создания открывает модалку, а не страницу', () => {
  beforeEach(() => {
    navigateSpy.mockClear()
    showSpy.mockClear()
    capturedAction = undefined
  })

  it('клик по «Открыть» показывает TaskCardModal по коду и не навигирует на /task/$code', async () => {
    const { result } = renderHook(() => useCreateTask(), { wrapper })

    await result.current.mutateAsync({
      projectId: 'p1',
      title: 'Задача',
      priority: 'MEDIUM',
      taskType: 'TASK',
    })

    await waitFor(() => expect(capturedAction?.label).toBe('Открыть'))

    capturedAction!.onClick()

    await waitFor(() => expect(showSpy).toHaveBeenCalledTimes(1))
    expect(showSpy.mock.calls[0]?.[1]).toEqual({ taskCode: 'ТП-1' })
    // Ключевой инвариант: полная страница задачи из этого пути не открывается.
    expect(navigateSpy).not.toHaveBeenCalled()
  })
})
