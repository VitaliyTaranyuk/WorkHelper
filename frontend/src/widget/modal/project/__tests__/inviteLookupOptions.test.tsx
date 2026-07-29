import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

/**
 * TD-028, постоянный репродьюсер. Поиск для приглашения делает backend по
 * ТОЧНОМУ username/email, а подпись варианта — «Имя (@username)». Встроенный
 * клиентский фильтр MUI Autocomplete сверяет варианты с введённым текстом и
 * выбрасывал единственный найденный: пользователь вводил полный email,
 * получал «Никто не найден» и не мог никого пригласить.
 *
 * Дефект дошёл до прода — юнит-тесты покрывали хук, а не список — и найден
 * живой проверкой (W-03).
 */

vi.mock('@ebay/nice-modal-react', () => ({
  default: { create: (component: unknown) => component },
  useModal: () => ({ visible: true, hide: vi.fn(), remove: vi.fn() }),
}))

vi.mock('@/features/project/query/useProjectData', () => ({
  useProjectData: () => ({ activeProject: { id: 'project-1' } }),
}))

vi.mock('@/shared/api/endpoint', () => ({
  workTechApi: {
    project: {
      addProjectForUsers: vi.fn(() => Promise.resolve({ data: {} })),
      createInvite: vi.fn(() => Promise.resolve({ data: { token: 't' } })),
    },
  },
}))

vi.mock('@/shared/ui/notify', () => ({
  notify: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}))

vi.mock('@/features/user/useUserLookup', () => ({
  useUserLookup: (query: string) => ({
    data:
      query.trim() === 'admin@mail.ru'
        ? [
            {
              id: 'u-1',
              firstName: 'Админ',
              lastName: '',
              displayName: 'Админ',
              username: 'admin',
            },
          ]
        : [],
  }),
}))

import { InviteUsersModal } from '../InviteUsersModal'

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

describe('приглашение в проект: поиск по точному совпадению (TD-028)', () => {
  it('показывает найденного пользователя, хотя его подпись не содержит введённый email', async () => {
    // id требует тип NiceModal-обёртки; в тесте обёртка замокана и проп не
    // используется — компонент рендерится напрямую.
    render(<InviteUsersModal id="invite-users" />, { wrapper })

    const input = screen.getByPlaceholderText('@username или email целиком')
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: 'admin@mail.ru' } })

    await waitFor(() =>
      expect(screen.getByText('Админ (@admin)')).toBeInTheDocument(),
    )
  })
})
