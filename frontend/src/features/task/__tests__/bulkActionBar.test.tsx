import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

/**
 * T-309: панель массовых действий. Проверяется связка «выбор → запрос», а не
 * вёрстка: именно здесь легче всего послать не те id или не тот проект.
 */

const bulkArchiveTasks = vi.fn()
const bulkMoveTasksStatus = vi.fn()
const bulkMoveTasksSprint = vi.fn()

vi.mock('@/shared/api/endpoint', () => ({
  workTechApi: {
    task: {
      bulkArchiveTasks: (a: unknown) => bulkArchiveTasks(a),
      bulkMoveTasksStatus: (a: unknown) => bulkMoveTasksStatus(a),
      bulkMoveTasksSprint: (a: unknown) => bulkMoveTasksSprint(a),
    },
  },
}))

vi.mock('@/features/project/query/useProjectData', () => ({
  useProjectData: () => ({
    activeProject: {
      id: 'p1',
      statuses: [
        { id: 10, code: 'To Do', description: 'To Do', viewed: true, defaultTaskStatus: false },
        { id: 11, code: 'Done', description: 'Done', viewed: true, defaultTaskStatus: false },
        // Скрытая и служебная целями не предлагаются.
        { id: 12, code: 'Canceled', description: 'Canceled', viewed: false, defaultTaskStatus: false },
        { id: 13, code: 'Backlog', description: 'Backlog', viewed: true, defaultTaskStatus: true },
      ],
    },
  }),
}))

vi.mock('@/features/sprint/query/useSprintsInfoQuery', () => ({
  useSprintsInfoQuery: () => ({ data: [{ id: 's1', name: 'Спринт 1' }] }),
}))

import { BulkActionBar } from '../BulkActionBar'
import { useTaskSelectionStore } from '../model/taskSelectionStore'

function wrapper(client: QueryClient) {
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
}

describe('панель массовых действий (T-309)', () => {
  let client: QueryClient

  beforeEach(() => {
    bulkArchiveTasks.mockResolvedValue({ data: { message: 'ok' } })
    bulkMoveTasksStatus.mockResolvedValue({ data: { message: 'ok' } })
    client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })
    useTaskSelectionStore.getState().clear()
  })

  afterEach(() => {
    vi.clearAllMocks()
    client.clear()
  })

  it('без выбора панели нет', () => {
    render(<BulkActionBar projectId="p1" />, { wrapper: wrapper(client) })
    expect(screen.queryByText(/Выбрано/)).not.toBeInTheDocument()
  })

  it('архивирует ровно выбранные задачи и снимает выбор после успеха', async () => {
    useTaskSelectionStore.getState().toggle('t1')
    useTaskSelectionStore.getState().toggle('t2')

    render(<BulkActionBar projectId="p1" />, { wrapper: wrapper(client) })
    expect(screen.getByText('Выбрано: 2 задачи')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'В архив' }))

    await waitFor(() =>
      expect(bulkArchiveTasks).toHaveBeenCalledWith({
        data: { projectId: 'p1', taskIds: ['t1', 't2'] },
      }),
    )
    // Выбор снимается только после успеха — иначе при рассинхроне пользователь
    // терял бы отметки и не мог повторить осознанно.
    await waitFor(() =>
      expect(useTaskSelectionStore.getState().selectedIds).toEqual([]),
    )
  })

  it('в целевые статусы не попадают скрытые и служебная колонка', async () => {
    useTaskSelectionStore.getState().toggle('t1')
    render(<BulkActionBar projectId="p1" />, { wrapper: wrapper(client) })

    fireEvent.click(screen.getByRole('button', { name: 'Статус…' }))
    await screen.findByRole('menuitem', { name: 'To Do' })

    expect(screen.getByRole('menuitem', { name: 'To Do' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Done' })).toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: 'Canceled' })).toBeNull()
    expect(screen.queryByRole('menuitem', { name: 'Backlog' })).toBeNull()
  })

  it('удаления и переноса между проектами в панели нет (осознанно)', () => {
    useTaskSelectionStore.getState().toggle('t1')
    render(<BulkActionBar projectId="p1" />, { wrapper: wrapper(client) })

    // Оба необратимы: удаление — насовсем, перенос между проектами
    // перевыдаёт код задачи и ломает старые ссылки.
    expect(screen.queryByRole('button', { name: /Удалить/ })).toBeNull()
    expect(screen.queryByRole('button', { name: /проект/i })).toBeNull()
  })
})
