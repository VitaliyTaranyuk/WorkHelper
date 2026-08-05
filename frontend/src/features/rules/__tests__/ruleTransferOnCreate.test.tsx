import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import NiceModal from '@ebay/nice-modal-react'
import type { ReactNode } from 'react'

/**
 * T-512: перенос правил при создании проекта.
 *
 * Проверяется не вёрстка модалки, а три свойства: донор уезжает на сервер
 * ровно тем, что выбрал пользователь; при отсутствии других проектов список
 * доноров не показывается вовсе (мёртвых контролов быть не должно, K-32); и
 * копирование общих наборов объявлено вслух, а не происходит само по себе
 * (W-06).
 */

const createProject = vi.fn()
const getAllUserProjects = vi.fn()
const getMyRuleSets = vi.fn()

vi.mock('@/shared/api/endpoint', () => ({
  workTechApi: {
    project: {
      createProject: (a: unknown) => createProject(a),
      getAllUserProjects: () => getAllUserProjects(),
    },
    rule: {
      getMyRuleSets: () => getMyRuleSets(),
      getProjectRuleSets: vi.fn(),
      createMyRuleSet: vi.fn(),
      createProjectRuleSet: vi.fn(),
      deleteRuleSet: vi.fn(),
      getRules: vi.fn(),
      addRule: vi.fn(),
      updateRule: vi.fn(),
      deleteRule: vi.fn(),
    },
  },
}))

import { CreateProjectModal } from '@/widget/modal/project/CreateProjectModal'

function wrapper(client: QueryClient) {
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>
      <NiceModal.Provider>{children}</NiceModal.Provider>
    </QueryClientProvider>
  )
}

function Host() {
  return (
    <button onClick={() => void NiceModal.show(CreateProjectModal)}>
      Открыть
    </button>
  )
}

async function openModal(client: QueryClient) {
  render(<Host />, { wrapper: wrapper(client) })
  fireEvent.click(screen.getByRole('button', { name: 'Открыть' }))
  await screen.findByLabelText('Название')
}

function fillRequiredFields() {
  fireEvent.change(screen.getByLabelText('Название'), {
    target: { value: 'Новый проект' },
  })
}

describe('перенос правил при создании проекта (T-512)', () => {
  let client: QueryClient

  beforeEach(() => {
    createProject.mockResolvedValue({ data: { id: 'p-new' } })
    getAllUserProjects.mockResolvedValue({ data: [] })
    getMyRuleSets.mockResolvedValue({ data: [] })
    client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
    client.clear()
  })

  it('без других проектов списка доноров нет', async () => {
    await openModal(client)

    await waitFor(() => expect(getAllUserProjects).toHaveBeenCalled())
    expect(
      screen.queryByLabelText('Скопировать правила из проекта'),
    ).not.toBeInTheDocument()
  })

  it('без донора запрос уходит как раньше', async () => {
    await openModal(client)
    fillRequiredFields()
    fireEvent.click(screen.getByRole('button', { name: 'Создать' }))

    await waitFor(() =>
      expect(createProject).toHaveBeenCalledWith({
        data: {
          name: 'Новый проект',
          code: 'НП',
          description: undefined,
          donorProjectId: undefined,
        },
      }),
    )
  })

  it('выбранный донор уезжает на сервер', async () => {
    getAllUserProjects.mockResolvedValue({
      data: [{ id: 'project-donor', name: 'WorkTask' }],
    })

    await openModal(client)
    const donor = await screen.findByLabelText('Скопировать правила из проекта')
    fillRequiredFields()

    fireEvent.mouseDown(donor)
    fireEvent.click(await screen.findByRole('option', { name: 'WorkTask' }))
    fireEvent.click(screen.getByRole('button', { name: 'Создать' }))

    await waitFor(() =>
      expect(createProject).toHaveBeenCalledWith({
        data: {
          name: 'Новый проект',
          code: 'НП',
          description: undefined,
          donorProjectId: 'project-donor',
        },
      }),
    )
  })

  /** W-06: перенос общих наборов не должен выглядеть происходящим сам по себе. */
  it('копирование общих наборов объявлено, когда они есть', async () => {
    getMyRuleSets.mockResolvedValue({
      data: [
        {
          id: 'set-1',
          projectId: null,
          name: 'Ядро',
          description: null,
          version: 1,
          rulesCount: 36,
          createdAt: '2026-08-05T10:00:00',
        },
      ],
    })

    await openModal(client)

    expect(
      await screen.findByText(/Ваши общие правила .* будут скопированы/),
    ).toBeInTheDocument()
  })

  it('без общих наборов ничего лишнего не обещается', async () => {
    await openModal(client)
    await waitFor(() => expect(getMyRuleSets).toHaveBeenCalled())

    expect(screen.queryByText(/будут скопированы/)).not.toBeInTheDocument()
  })
})
