import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

/**
 * T-510: привязка проекта к репозиторию.
 *
 * Проверяется не вёрстка, а два свойства: запрос уходит в проект из пропса
 * (а не в «текущий» — урок T-518), и проект БЕЗ привязок показывает честное
 * объяснение, а не пустоту (W-06). Второе важно отдельно: привязка
 * необязательна по инварианту I-03, и пустой раздел — норма, а не сбой.
 */

const getRepoBindings = vi.fn()
const createRepoBinding = vi.fn()
const deleteRepoBinding = vi.fn()

vi.mock('@/shared/api/endpoint', () => ({
  workTechApi: {
    repoBinding: {
      getRepoBindings: (a: unknown) => getRepoBindings(a),
      createRepoBinding: (a: unknown) => createRepoBinding(a),
      deleteRepoBinding: (a: unknown) => deleteRepoBinding(a),
      updateRepoBinding: vi.fn(),
    },
  },
}))

import { RepoBindingsSection } from '../RepoBindingsSection'

function wrapper(client: QueryClient) {
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
}

describe('репозитории проекта (T-510)', () => {
  let client: QueryClient

  beforeEach(() => {
    getRepoBindings.mockResolvedValue({ data: [] })
    createRepoBinding.mockResolvedValue({
      data: {
        id: 'b1',
        provider: 'github',
        url: 'https://github.com/x/y',
        defaultBranch: 'main',
        createdAt: '2026-08-03T10:00:00',
      },
    })
    client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
    client.clear()
  })

  it('проект без привязок объясняет это, а не молчит', async () => {
    render(<RepoBindingsSection projectId="p1" />, { wrapper: wrapper(client) })

    await waitFor(() =>
      expect(screen.getByText(/Репозиторий не привязан/)).toBeInTheDocument(),
    )
    // Именно «нормально», а не «ошибка»: привязка необязательна (I-03).
    expect(screen.getByText(/Это нормально/)).toBeInTheDocument()
  })

  it('привязки запрашиваются у проекта из пропса', async () => {
    render(<RepoBindingsSection projectId="project-from-url" />, {
      wrapper: wrapper(client),
    })

    await waitFor(() =>
      expect(getRepoBindings).toHaveBeenCalledWith({
        projectId: 'project-from-url',
      }),
    )
  })

  it('привязка отправляется с введёнными адресом и веткой', async () => {
    render(<RepoBindingsSection projectId="p1" />, { wrapper: wrapper(client) })
    await screen.findByText(/Репозиторий не привязан/)

    fireEvent.change(screen.getByLabelText('Адрес репозитория'), {
      target: { value: 'https://github.com/x/y' },
    })
    fireEvent.change(screen.getByLabelText('Ветка по умолчанию'), {
      target: { value: 'develop' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Привязать' }))

    await waitFor(() =>
      expect(createRepoBinding).toHaveBeenCalledWith({
        projectId: 'p1',
        data: {
          provider: 'github',
          url: 'https://github.com/x/y',
          defaultBranch: 'develop',
        },
      }),
    )
  })

  it('существующие привязки показаны с провайдером и веткой', async () => {
    getRepoBindings.mockResolvedValue({
      data: [
        {
          id: 'b1',
          provider: 'gitlab',
          url: 'https://gitlab.com/a/b',
          defaultBranch: 'trunk',
          createdAt: '2026-08-03T10:00:00',
        },
      ],
    })

    render(<RepoBindingsSection projectId="p1" />, { wrapper: wrapper(client) })

    await waitFor(() =>
      expect(screen.getByText('https://gitlab.com/a/b')).toBeInTheDocument(),
    )
    expect(screen.getByText(/gitlab · ветка по умолчанию: trunk/)).toBeInTheDocument()
  })

  it('пустой адрес не даёт отправить форму', async () => {
    render(<RepoBindingsSection projectId="p1" />, { wrapper: wrapper(client) })
    await screen.findByText(/Репозиторий не привязан/)

    expect(screen.getByRole('button', { name: 'Привязать' })).toBeDisabled()
    expect(createRepoBinding).not.toHaveBeenCalled()
  })
})
