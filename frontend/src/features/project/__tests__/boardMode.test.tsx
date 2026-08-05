import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { mapProjectDtoToProjectInfo } from '@/entities/project/mapDTO'

/**
 * T-519: режим доски проекта.
 *
 * Проверяется не вёрстка, а свойства: ответ без поля режима читается как «спринты» —
 * дрейф контракта не имеет права превратить доску в Kanban (W-08); переключение уходит на
 * сервер с проектом из пропса; повторный клик по выбранному режиму ничего не отправляет —
 * «нет режима» означало бы возврат к неявному состоянию, ради которого задача и делалась.
 */

const getProjectData = vi.fn()
const getAllUserProjects = vi.fn()
const getActiveProject = vi.fn()
const setBoardMode = vi.fn()

vi.mock('@/shared/api/endpoint', () => ({
  workTechApi: {
    project: {
      getProjectData: (a: unknown) => getProjectData(a),
      getAllUserProjects: () => getAllUserProjects(),
      getActiveProject: () => getActiveProject(),
      setBoardMode: (a: unknown) => setBoardMode(a),
    },
  },
}))

import { BoardModeSection } from '../BoardModeSection'

function wrapper(client: QueryClient) {
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
}

const PROJECT = {
  id: 'p1',
  name: 'WorkTask',
  code: 'ТП',
  boardMode: 'SPRINT',
  statuses: [{ id: 1, code: 'To Do', description: 'To Do', viewed: true, defaultTaskStatus: true, priority: 1 }],
  users: [],
}

describe('режим доски проекта (T-519)', () => {
  let client: QueryClient

  beforeEach(() => {
    getAllUserProjects.mockResolvedValue({ data: [{ id: 'p1', name: 'WorkTask' }] })
    getActiveProject.mockResolvedValue({ data: { id: 'p1' } })
    getProjectData.mockResolvedValue({ data: PROJECT })
    setBoardMode.mockResolvedValue({ data: { ...PROJECT, boardMode: 'KANBAN' } })
    client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
    client.clear()
  })

  /**
   * W-08: старый ответ без поля режима обязан читаться как «спринты» — тот же дефолт,
   * что на сервере. Иначе дрейф контракта молча переключил бы доску в Kanban.
   */
  it('ответ без поля режима читается как SPRINT', () => {
    const mapped = mapProjectDtoToProjectInfo({
      id: 'p1',
      name: 'WorkTask',
      code: 'ТП',
    } as never)

    expect(mapped.boardMode).toBe('SPRINT')
  })

  it('переключение уходит на сервер с проектом из пропса', async () => {
    render(<BoardModeSection projectId="p1" />, { wrapper: wrapper(client) })

    fireEvent.click(await screen.findByRole('button', { name: 'Kanban' }))

    await waitFor(() =>
      expect(setBoardMode).toHaveBeenCalledWith({
        projectId: 'p1',
        boardMode: 'KANBAN',
      }),
    )
  })

  /** «Нет режима» означало бы возврат к неявному состоянию — снимать режим некуда. */
  it('повторный клик по выбранному режиму ничего не отправляет', async () => {
    render(<BoardModeSection projectId="p1" />, { wrapper: wrapper(client) })

    fireEvent.click(await screen.findByRole('button', { name: 'Спринты' }))

    await waitFor(() => expect(getProjectData).toHaveBeenCalled())
    expect(setBoardMode).not.toHaveBeenCalled()
  })

  /** Раздел обязан сказать, что переключение обратимо: иначе оно выглядит разрушительным. */
  it('раздел объясняет, что спринты не удаляются', async () => {
    render(<BoardModeSection projectId="p1" />, { wrapper: wrapper(client) })

    expect(
      await screen.findByText(/Переключение обратимо: спринты не удаляются/),
    ).toBeInTheDocument()
  })
})
