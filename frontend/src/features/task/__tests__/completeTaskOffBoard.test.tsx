import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import NiceModal from '@ebay/nice-modal-react'

// Герметичность: сеть из тестов не ходит (паттерн taskCardEdgeFixtures).
vi.mock('@/shared/api/workTechHttpClient', () => ({
  workTechApiClient: Object.assign(
    vi.fn(() => new Promise(() => undefined)),
    { interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } } },
  ),
  buildApiUrl: (endpoint: string) => endpoint,
  addWorkTechApiValidationMiddleware: () => undefined,
}))

const STATUSES = [
  { id: 1, code: 'To Do', priority: 1, viewed: true, defaultTaskStatus: false },
  { id: 2, code: 'In Progress', priority: 2, viewed: true, defaultTaskStatus: false },
  { id: 4, code: 'Done', priority: 6, viewed: true, defaultTaskStatus: false },
]

vi.mock('@/features/project/query/useProjectData', () => ({
  useProjectData: () => ({
    activeProject: {
      id: 'p-1',
      name: 'WorkTask',
      users: [],
      statuses: STATUSES,
      // Завершающая колонка — как её считает useProjectData (макс. priority
      // среди видимых недефолтных) и бэкенд (completedBoardStatus).
      resolveStatus: STATUSES[2],
    },
    userProjects: [],
    isLoading: false,
  }),
}))

vi.mock('@/features/sprint/query/useSprintsInfoQuery', () => ({
  useSprintsInfoQuery: () => ({
    data: [
      { id: 'active-1', name: 'Спринт', isActive: true, isDefault: false },
      { id: 'backlog-1', name: 'Backlog', isActive: false, isDefault: true },
    ],
    isLoading: false,
  }),
}))

import { TaskCardContent } from '../TaskCardContent'
import type { ITaskCard } from '@/entities/task/types'

const task = (sprintId: string): ITaskCard =>
  ({
    id: 't-1',
    code: 'ТП-1',
    title: 'Задача',
    priority: 'MEDIUM',
    taskType: 'TASK',
    sprintId,
    status: { id: 1, code: 'To Do' },
  }) as ITaskCard

function renderCard(sprintId: string) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={client}>
      <NiceModal.Provider>
        <TaskCardContent task={task(sprintId)} />
      </NiceModal.Provider>
    </QueryClientProvider>,
  )
}

/** Открыть выпадающий список статуса и вернуть его опции. */
async function openStatusOptions() {
  // MUI Select открывается по mouseDown, не по click.
  fireEvent.mouseDown(screen.getAllByRole('combobox')[0])
  const listbox = await screen.findByRole('listbox')
  return within(listbox)
    .getAllByRole('option')
    .map((o) => o.textContent?.trim())
}

/**
 * Задачу вне доски (бэклог, неактивный спринт) можно ЗАВЕРШИТЬ, но нельзя
 * перевести в промежуточную колонку.
 *
 * До этого изменения статус вне доски был недоступен вовсе (ТП-74), и закрыть
 * задачу бэклога можно было только протащив её через активный спринт — что
 * искажает историю спринта: задача в нём не выполнялась. «Завершено» — не
 * позиция на доске, а факт, поэтому оси «спринт» и «статус» снова независимы
 * там, где это осмысленно (ТП-49).
 */
describe('завершение задачи вне доски', () => {
  it('в бэклоге показывает статус с единственным переходом — в завершающую колонку', async () => {
    renderCard('backlog-1')

    expect(
      screen.getByText('Вне активного спринта задачу можно только завершить'),
    ).toBeInTheDocument()

    const options = await openStatusOptions()
    expect(options).toContain('To Do') // текущий — виден, чтобы список не был пустым
    expect(options).toContain('Done') // завершение доступно
    expect(options).not.toContain('In Progress') // промежуточные — только на доске
  })

  it('в активном спринте оставляет все колонки доски', async () => {
    renderCard('active-1')

    expect(
      screen.queryByText('Вне активного спринта задачу можно только завершить'),
    ).not.toBeInTheDocument()

    const options = await openStatusOptions()
    expect(options).toEqual(expect.arrayContaining(['To Do', 'In Progress', 'Done']))
  })
})
