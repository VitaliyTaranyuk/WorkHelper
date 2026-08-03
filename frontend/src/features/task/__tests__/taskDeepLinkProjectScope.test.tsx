import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

/**
 * G-4 (вторая половина T-518): deep-link задачи содержит проект.
 *
 * Раньше маршрут был `/task/$code`, а проект подставлялся «текущий» из
 * `useProjectData()`, поэтому одна и та же ссылка открывала у разных людей
 * РАЗНЫЕ задачи — или 404. Бэкенд всегда был корректен
 * (`GET /tasks/{projectId}/code/{code}`), двусмысленность жила на фронте.
 */

const findTaskByCode = vi.fn()
const getActiveProject = vi.fn()
const getAllUserProjects = vi.fn()
const getProjectData = vi.fn()

vi.mock('@/shared/api/endpoint', () => ({
  workTechApi: {
    task: { findTaskByCode: (args: unknown) => findTaskByCode(args) },
    project: {
      getActiveProject: () => getActiveProject(),
      getAllUserProjects: () => getAllUserProjects(),
      getProjectData: (args: unknown) => getProjectData(args),
    },
  },
}))

// BackButton тянет роутер, а проверяем мы шов «адрес → запрос».
vi.mock('@/features/navigation/BackButton', () => ({
  BackButton: () => null,
}))

import { EditTaskPage } from '@/page/task/EditTaskPage'
import { useCurrentProjectStore } from '@/features/project/model/currentProjectStore'

function wrapper(client: QueryClient) {
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
}

describe('deep-link задачи резолвится в проекте из адреса (G-4)', () => {
  let client: QueryClient

  beforeEach(() => {
    // «Текущим» на сервере и в списке значится ЧУЖОЙ проект — именно он
    // подставлялся раньше и уводил ссылку не туда.
    getActiveProject.mockResolvedValue({ data: { id: 'project-current' } })
    getAllUserProjects.mockResolvedValue({ data: [{ id: 'project-current' }] })
    getProjectData.mockResolvedValue({
      data: { id: 'project-current', name: 'Текущий', statuses: [], users: [] },
    })
    // Задача не приезжает: карточка не монтируется, проверяем только адресацию.
    findTaskByCode.mockReturnValue(new Promise(() => {}))
    client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    useCurrentProjectStore.setState({ projectId: 'project-current' })
  })

  afterEach(() => {
    vi.clearAllMocks()
    client.clear()
  })

  it('задача запрашивается у проекта из адреса, а не у «текущего»', async () => {
    render(<EditTaskPage projectId="project-from-link" code="ТП-236" />, {
      wrapper: wrapper(client),
    })

    await waitFor(() =>
      expect(findTaskByCode).toHaveBeenCalledWith({
        code: 'ТП-236',
        projectId: 'project-from-link',
      }),
    )
    // Никаких запросов к «текущему» проекту за этой задачей быть не может:
    // именно так ссылка и открывала чужую задачу.
    expect(findTaskByCode).not.toHaveBeenCalledWith(
      expect.objectContaining({ projectId: 'project-current' }),
    )
  })

  it('страница объявляет проект из адреса текущим для вкладки', async () => {
    render(<EditTaskPage projectId="project-from-link" code="ТП-236" />, {
      wrapper: wrapper(client),
    })

    // Иначе карточка внутри (TaskCardContent → useProjectData) считала бы
    // задачу принадлежащей прежнему проекту: статусы, участники и сохранение
    // ушли бы не туда.
    await waitFor(() =>
      expect(useCurrentProjectStore.getState().projectId).toBe(
        'project-from-link',
      ),
    )
  })
})
