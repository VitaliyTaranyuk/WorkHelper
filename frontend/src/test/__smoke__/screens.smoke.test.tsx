import { describe, expect, it, vi } from 'vitest'
import { render } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import NiceModal from '@ebay/nice-modal-react'
import type { ReactNode } from 'react'

// Сеть в smoke не ходит: HTTP-клиент отвечает вечным pending — экраны
// корректно живут в loading; сетевые ошибки (AggregateError) не сыплются.
vi.mock('@/shared/api/workTechHttpClient', () => ({
  workTechApiClient: Object.assign(
    vi.fn(() => new Promise(() => undefined)),
    { interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } } },
  ),
  buildApiUrl: (endpoint: string) => endpoint,
  addWorkTechApiValidationMiddleware: () => undefined,
}))

import { MainPage } from '@/page/main'
import { TaskListPage } from '@/page/tasks/TaskListPage'
import { CalendarPage } from '@/page/calendar/CalendarPage'
import { MeetLobby } from '@/features/meet/ui/MeetLobby'

/**
 * ТП-172 (T2): smoke — ключевые экраны МОНТИРУЮТСЯ без краша. Ловит класс
 * инцидента «белый экран»: необработанное исключение при рендере экрана.
 * Гейт T4 (src/test/setup.ts) дополнительно валит тест на незамеченном
 * console.error (так React репортит краши рендера и error boundaries) —
 * явные assert'ы на это не нужны.
 *
 * Уровень: рендер в jsdom с пустым QueryClient (данные в загрузке) — экран
 * обязан корректно жить в loading-состоянии. Экран настроек покрыт
 * собственным тестом (SettingsPage.test.tsx). Расширение фикстурами данных —
 * T3 (краевые данные карточки) и далее по экранам.
 */

function Providers({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  })
  return (
    <QueryClientProvider client={client}>
      <NiceModal.Provider>{children}</NiceModal.Provider>
    </QueryClientProvider>
  )
}

describe('smoke: ключевые экраны монтируются (ТП-172 T2)', () => {
  it('Доска (MainPage)', () => {
    expect(() =>
      render(
        <Providers>
          <MainPage />
        </Providers>,
      ),
    ).not.toThrow()
  })

  it('Список задач (TaskListPage)', () => {
    expect(() =>
      render(
        <Providers>
          <TaskListPage projectId="p-1" />
        </Providers>,
      ),
    ).not.toThrow()
  })

  it('Календарь (CalendarPage)', () => {
    expect(() =>
      render(
        <Providers>
          <CalendarPage projectId="p-1" />
        </Providers>,
      ),
    ).not.toThrow()
  })

  it('Лобби встречи (MeetLobby) — вход без устройств', () => {
    expect(() =>
      render(
        <Providers>
          <MeetLobby
            room={{
              token: 'tok',
              title: 'Планёрка',
              projectId: 'p-1',
              projectName: 'WorkTask',
              maxParticipants: 8,
              participants: [],
            } as never}
            stream={null}
            access="no-devices"
            microphones={[]}
            cameras={[]}
            audioDeviceId=""
            videoDeviceId=""
            onSelectMicrophone={() => undefined}
            onSelectCamera={() => undefined}
            onRetry={() => undefined}
            onJoin={() => undefined}
          />
        </Providers>,
      ),
    ).not.toThrow()
  })
})
