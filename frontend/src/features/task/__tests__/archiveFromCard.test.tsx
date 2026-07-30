import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import NiceModal from '@ebay/nice-modal-react'

/**
 * T-151: эндпоинты архивации существовали с 2026-07, но в интерфейсе не было
 * ни одной кнопки — недоступная функциональность (**K-32**). Тест закрепляет
 * обе стороны сценария на самой карточке: обычную задачу можно отправить в
 * архив, архивную — вернуть. «Архив в один конец» он не пропустит.
 */

// Герметичность: сеть из тестов не ходит (паттерн completeTaskOffBoard).
vi.mock('@/shared/api/workTechHttpClient', () => ({
  workTechApiClient: Object.assign(
    vi.fn(() => new Promise(() => undefined)),
    { interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } } },
  ),
  buildApiUrl: (endpoint: string) => endpoint,
  addWorkTechApiValidationMiddleware: () => undefined,
}))

const archiveTask = vi.fn()
const restoreTask = vi.fn()

vi.mock('@/shared/api/endpoint', () => ({
  workTechApi: {
    task: {
      archiveTask: (args: unknown) => archiveTask(args),
      restoreTask: (args: unknown) => restoreTask(args),
    },
  },
}))

const STATUSES = [
  { id: 1, code: 'To Do', priority: 1, viewed: true, defaultTaskStatus: false },
  { id: 4, code: 'Done', priority: 6, viewed: true, defaultTaskStatus: false },
]

vi.mock('@/features/project/query/useProjectData', () => ({
  useProjectData: () => ({
    activeProject: {
      id: 'p-1',
      name: 'WorkTask',
      users: [],
      statuses: STATUSES,
      resolveStatus: STATUSES[1],
    },
    userProjects: [],
    isLoading: false,
  }),
}))

vi.mock('@/features/sprint/query/useSprintsInfoQuery', () => ({
  useSprintsInfoQuery: () => ({
    data: [{ id: 'active-1', name: 'Спринт', isActive: true, isDefault: false }],
    isLoading: false,
  }),
}))

import { TaskCardContent } from '../TaskCardContent'
import type { ITaskCard } from '@/entities/task/types'

const task = (archived: boolean): ITaskCard =>
  ({
    id: 't-1',
    code: 'ТП-1',
    title: 'Задача',
    priority: 'MEDIUM',
    taskType: 'TASK',
    sprintId: 'active-1',
    archived,
    status: { id: 1, code: 'To Do' },
  }) as ITaskCard

function renderCard(archived: boolean) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  const onDeleted = vi.fn()
  render(
    <QueryClientProvider client={client}>
      <NiceModal.Provider>
        <TaskCardContent task={task(archived)} onDeleted={onDeleted} />
      </NiceModal.Provider>
    </QueryClientProvider>,
  )
  return { onDeleted }
}

describe('архивация из карточки задачи (T-151)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('обычную задачу отправляет в архив и закрывает карточку', async () => {
    archiveTask.mockResolvedValue({ data: {} })
    const { onDeleted } = renderCard(false)

    fireEvent.click(screen.getByRole('button', { name: 'В архив' }))

    await waitFor(() =>
      expect(archiveTask).toHaveBeenCalledWith({
        projectId: 'p-1',
        taskId: 't-1',
      }),
    )
    await waitFor(() => expect(onDeleted).toHaveBeenCalled())
    expect(restoreTask).not.toHaveBeenCalled()
  })

  it('архивную возвращает обратно — архив не в один конец', async () => {
    restoreTask.mockResolvedValue({ data: {} })
    renderCard(true)

    fireEvent.click(screen.getByRole('button', { name: 'Вернуть из архива' }))

    await waitFor(() =>
      expect(restoreTask).toHaveBeenCalledWith({
        projectId: 'p-1',
        taskId: 't-1',
      }),
    )
    expect(archiveTask).not.toHaveBeenCalled()
  })
})
