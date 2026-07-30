import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

/**
 * T-518: проект берётся из адреса открытой страницы, а не из общего для всех
 * вкладок серверного `last_project_id`. Раньше просмотр другого проекта
 * переключал рабочий контекст глобально: доска в соседней вкладке уезжала за
 * ним после ближайшего поллинга (G-1…G-3 аудита T-500).
 */

const getActiveProject = vi.fn()
const getProjectData = vi.fn()
const getAllUserProjects = vi.fn()
const getBoardTasks = vi.fn()

vi.mock('@/shared/api/endpoint', () => ({
  workTechApi: {
    project: {
      getActiveProject: () => getActiveProject(),
      getProjectData: (args: unknown) => getProjectData(args),
      getAllUserProjects: () => getAllUserProjects(),
    },
    task: {
      getBoardTasks: (args: unknown) => getBoardTasks(args),
    },
  },
}))

import { useEntryProjectId, useProjectData } from '../query/useProjectData'
import { useCurrentProjectStore } from '../model/currentProjectStore'
import { useActiveSprintTasks } from '@/features/task/query/useActiveSprintTasks'

function wrapper(client: QueryClient) {
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
}

const projectDto = (id: string) => ({
  data: {
    id,
    name: `Проект ${id}`,
    // Колонки заводятся вместе с проектом (createDefaultStatuses), поэтому
    // фикстура их содержит: без них useProjectData не смог бы вычислить
    // завершающий статус.
    statuses: [
      {
        id: 1,
        code: 'To Do',
        description: 'To Do',
        priority: 1,
        viewed: true,
        defaultTaskStatus: false,
      },
      {
        id: 2,
        code: 'Done',
        description: 'Done',
        priority: 4,
        viewed: true,
        defaultTaskStatus: false,
      },
    ],
    users: [],
    sprints: [],
  },
})

describe('проект берётся из адреса страницы (T-518)', () => {
  let client: QueryClient

  beforeEach(() => {
    getAllUserProjects.mockResolvedValue({ data: [{ id: 'project-server' }] })
    getActiveProject.mockResolvedValue({ data: { id: 'project-server' } })
    getProjectData.mockImplementation(({ projectId }: { projectId: string }) =>
      Promise.resolve(projectDto(projectId)),
    )
    getBoardTasks.mockResolvedValue({ data: [] })
    client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    useCurrentProjectStore.setState({ projectId: null })
  })

  // Стор сбрасывается в beforeEach, а не после теста: смонтированный хук
  // подписан на него, и запись после теста дала бы обновление вне act().
  afterEach(() => {
    vi.clearAllMocks()
    client.clear()
  })

  it('проект из маршрута важнее серверного «последнего»', async () => {
    useCurrentProjectStore.setState({ projectId: 'project-from-url' })

    const { result } = renderHook(() => useProjectData(), {
      wrapper: wrapper(client),
    })

    await waitFor(() =>
      expect(result.current.activeProject?.id).toBe('project-from-url'),
    )
    expect(getProjectData).toHaveBeenCalledWith({
      projectId: 'project-from-url',
    })
    // Серверное «последнее место» при известном из адреса проекте вообще не
    // спрашивается — иначе оно снова стало бы источником истины.
    expect(getActiveProject).not.toHaveBeenCalled()
  })

  it('без проекта в адресе работает прежняя точка входа — последний проект', async () => {
    const { result } = renderHook(() => useProjectData(), {
      wrapper: wrapper(client),
    })

    await waitFor(() =>
      expect(result.current.activeProject?.id).toBe('project-server'),
    )
    expect(getProjectData).toHaveBeenCalledWith({ projectId: 'project-server' })
  })

  /**
   * Постоянный репродьюсер гонки, найденной живой проверкой на проде с двумя
   * проектами: список проектов приходит отдельным запросом и часто быстрее
   * ответа о последнем открытом. Точка входа успевала увести в первый по
   * алфавиту проект — при том же состоянии сервера переход открывал то нужный
   * проект, то чужой.
   */
  it('точка входа не уводит в первый проект, пока сервер не ответил про последний', async () => {
    getAllUserProjects.mockResolvedValue({
      data: [{ id: 'project-first' }, { id: 'project-server' }],
    })
    getActiveProject.mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(() => resolve({ data: { id: 'project-server' } }), 60),
        ),
    )

    const seen: string[] = []
    const { result } = renderHook(
      () => {
        const entry = useEntryProjectId()
        if (entry.projectId) seen.push(entry.projectId)
        return entry
      },
      { wrapper: wrapper(client) },
    )

    await waitFor(() => expect(result.current.projectId).toBe('project-server'))
    expect(seen).not.toContain('project-first')
  })

  it('доска запрашивает задачи по проекту из адреса, а не «активного» на сервере', async () => {
    renderHook(() => useActiveSprintTasks({ projectId: 'project-from-url' }), {
      wrapper: wrapper(client),
    })

    await waitFor(() =>
      expect(getBoardTasks).toHaveBeenCalledWith({
        projectId: 'project-from-url',
      }),
    )
  })
})
