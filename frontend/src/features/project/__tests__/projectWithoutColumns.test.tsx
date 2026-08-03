import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

/**
 * TD-031 / T-308: завершающий статус вычислялся `reduce` без начального
 * значения — на пустом списке колонок это TypeError, роняющий весь экран
 * проекта в ErrorBoundary.
 *
 * Пустой список приезжает не только из «проекта без колонок»: шесть системных
 * колонок удалить нельзя (TaskStatusService.deleteStatus отвергает
 * defaultTaskStatus и systemStatus), но mapProjectDtoToProjectInfo превращает
 * ОТСУТСТВУЮЩЕЕ поле `statuses` в [] — то есть достаточно расхождения
 * контракта, и фронтенд обязан деградировать, а не бросать (W-08).
 */

const getActiveProject = vi.fn()
const getProjectData = vi.fn()
const getAllUserProjects = vi.fn()

vi.mock('@/shared/api/endpoint', () => ({
  workTechApi: {
    project: {
      getActiveProject: () => getActiveProject(),
      getProjectData: (args: unknown) => getProjectData(args),
      getAllUserProjects: () => getAllUserProjects(),
    },
  },
}))

import { useProjectData } from '../query/useProjectData'
import { useCurrentProjectStore } from '../model/currentProjectStore'

function wrapper(client: QueryClient) {
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
}

const status = (id: number, code: string, priority: number, viewed = true) => ({
  id,
  code,
  description: code,
  priority,
  viewed,
  defaultTaskStatus: false,
})

describe('проект без колонок не роняет экран (TD-031)', () => {
  let client: QueryClient

  beforeEach(() => {
    getAllUserProjects.mockResolvedValue({ data: [{ id: 'p1' }] })
    getActiveProject.mockResolvedValue({ data: { id: 'p1' } })
    client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    useCurrentProjectStore.setState({ projectId: 'p1' })
  })

  // Стор пишется только в beforeEach: смонтированный хук на него подписан, и
  // запись после теста дала бы обновление вне act() — тот же случай, что в
  // currentProjectScope.test.tsx.
  afterEach(() => {
    vi.clearAllMocks()
    client.clear()
  })

  it('пустой список колонок отдаёт resolveStatus = undefined, а не бросает', async () => {
    getProjectData.mockResolvedValue({
      data: { id: 'p1', name: 'Без колонок', statuses: [], users: [] },
    })

    const { result } = renderHook(() => useProjectData(), {
      wrapper: wrapper(client),
    })

    await waitFor(() => expect(result.current.activeProject).not.toBeNull())
    expect(result.current.activeProject?.statuses).toEqual([])
    expect(result.current.activeProject?.resolveStatus).toBeUndefined()
  })

  it('отсутствующее поле statuses обрабатывается так же (дрейф контракта, W-08)', async () => {
    getProjectData.mockResolvedValue({
      data: { id: 'p1', name: 'Без поля', users: [] },
    })

    const { result } = renderHook(() => useProjectData(), {
      wrapper: wrapper(client),
    })

    await waitFor(() => expect(result.current.activeProject).not.toBeNull())
    expect(result.current.activeProject?.resolveStatus).toBeUndefined()
  })

  // Негативный контроль: без него первый тест прошёл бы и на реализации,
  // которая всегда возвращает undefined.
  it('при нормальных данных завершающая колонка — последняя видимая по приоритету', async () => {
    getProjectData.mockResolvedValue({
      data: {
        id: 'p1',
        name: 'Обычный',
        statuses: [
          status(1, 'To Do', 1),
          status(2, 'Done', 4),
          // Скрытая колонка с большим приоритетом завершающей быть не может —
          // иначе Done-задачи считались бы незавершёнными (BUG-033/BUG-034).
          status(3, 'Canceled', 9, false),
        ],
        users: [],
      },
    })

    const { result } = renderHook(() => useProjectData(), {
      wrapper: wrapper(client),
    })

    await waitFor(() =>
      expect(result.current.activeProject?.resolveStatus).toBeDefined(),
    )
    expect(result.current.activeProject?.resolveStatus?.code).toBe('Done')
  })
})
