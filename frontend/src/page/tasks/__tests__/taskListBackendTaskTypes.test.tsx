import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import NiceModal from '@ebay/nice-modal-react'
import type { ReactNode } from 'react'

/**
 * Репро прод-инцидента 2026-07-28 (правило post-mortem, ТП-172 T7):
 * «в списке задач остались только завершённые — текущие задачи и бэклог
 * пропали».
 *
 * Корень: бэкенд отдаёт `TaskType` из ЧЕТЫРЁХ значений
 * (`TASK|BUG|RESEARCH|STORY`) и `Priority` из ЧЕТЫРЁХ (`BLOCKER|HIGH|MEDIUM|
 * LOW`), а фронтовый маппер знал только `TASK|BUG` и `LOW|MEDIUM|HIGH` и на
 * незнакомом значении БРОСАЛ исключение. Одна задача-исследование в бэклоге
 * роняла запрос целиком — исчезали ВСЕ секции спринтов, оставалась только
 * «Завершённые» (она грузится отдельным запросом).
 *
 * Инвариант, который защищает тест: ни одно значение перечислений бэкенда не
 * обнуляет список задач.
 */

const BACKLOG_ID = 'sprint-backlog'
const DRAFT_ID = 'sprint-draft'

function taskDto(over: Record<string, unknown>) {
  return {
    id: 'task-1',
    title: 'Задача',
    description: null,
    priority: 'MEDIUM',
    assignee: null,
    creator: { id: 'u-1', firstName: 'Иван', lastName: 'Иванов' },
    projectId: 'p-1',
    sprintId: BACKLOG_ID,
    taskType: 'TASK',
    status: { id: 1, code: 'To Do', description: 'To Do' },
    code: 'ТП-1',
    position: 0,
    createdAt: '2026-07-27T22:19:18',
    updatedAt: '2026-07-27T22:19:18',
    archived: false,
    completedDate: null,
    awaitingReply: false,
    ...over,
  }
}

const sprintList = {
  sprints: [
    {
      id: DRAFT_ID,
      name: 'Спринт 2',
      goal: null,
      startDate: null,
      endDate: null,
      active: false,
      paused: false,
      defaultSprint: false,
      status: 'DRAFT',
      tasks: [
        taskDto({
          id: 'task-story',
          code: 'ТП-3',
          title: 'История пользователя',
          taskType: 'STORY',
          priority: 'BLOCKER',
          sprintId: DRAFT_ID,
        }),
      ],
    },
    {
      id: BACKLOG_ID,
      name: 'Backlog',
      goal: null,
      startDate: null,
      endDate: null,
      active: false,
      paused: false,
      defaultSprint: true,
      status: 'DRAFT',
      tasks: [
        taskDto({
          id: 'task-research',
          code: 'ТП-2',
          title: 'Аудит доставки правил агенту',
          taskType: 'RESEARCH',
        }),
        taskDto({ id: 'task-plain', code: 'ТП-1', title: 'Обычная задача' }),
      ],
    },
  ],
}

const getALLSprints = vi.fn(async () => ({ data: sprintList }))

vi.mock('@/shared/api/endpoint', () => ({
  workTechApi: {
    sprint: {
      getALLSprints: (...args: unknown[]) =>
        (getALLSprints as (...a: unknown[]) => Promise<unknown>)(...args),
      getALLSprintsInfo: async () => ({ data: { sprints: [] } }),
    },
    task: {
      getCompletedTasks: async () => ({ data: [] }),
      searchTasks: async () => ({ data: [] }),
      reorderSprint: async () => ({ data: undefined }),
    },
  },
}))

// Сеть из тестов не ходит (как в smoke ТП-172 T2).
vi.mock('@/shared/api/workTechHttpClient', () => ({
  workTechApiClient: Object.assign(
    vi.fn(() => new Promise(() => undefined)),
    { interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } } },
  ),
  buildApiUrl: (endpoint: string) => endpoint,
  addWorkTechApiValidationMiddleware: () => undefined,
}))

import { TaskListPage } from '../TaskListPage'

function Providers({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return (
    <QueryClientProvider client={client}>
      <NiceModal.Provider>{children}</NiceModal.Provider>
    </QueryClientProvider>
  )
}

describe('Список задач: типы и приоритеты бэкенда (репро 2026-07-28)', () => {
  it('секции спринтов и бэклога видны, задача-исследование не роняет список', async () => {
    render(
      <Providers>
        <TaskListPage projectId="p-1" />
      </Providers>,
    )

    // Бэклог и спринт на месте — раньше исчезали целиком.
    expect(await screen.findByText('Бэклог')).toBeInTheDocument()
    expect(screen.getByText('Спринт 2')).toBeInTheDocument()

    // Видны и «незнакомая» задача, и соседние по секции.
    expect(
      screen.getByText('Аудит доставки правил агенту'),
    ).toBeInTheDocument()
    expect(screen.getByText('Обычная задача')).toBeInTheDocument()
    expect(screen.getByText('История пользователя')).toBeInTheDocument()
  })

  it('ошибка загрузки спринтов показывается явно, а не пустым экраном', async () => {
    getALLSprints.mockRejectedValueOnce(new Error('Network Error'))

    render(
      <Providers>
        <TaskListPage projectId="p-1" />
      </Providers>,
    )

    expect(
      await screen.findByText('Не удалось загрузить список задач'),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Повторить' })).toBeInTheDocument()
  })
})
