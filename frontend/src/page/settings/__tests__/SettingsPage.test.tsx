import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

// T-511: на странице появилась секция «Общие правила», а она ходит в API.
// Мокаем сеть, а не выключаем секцию: тест обязан проверять ту страницу,
// которую видит пользователь.
vi.mock('@/shared/api/endpoint', () => ({
  workTechApi: {
    rule: {
      getMyRuleSets: vi.fn().mockResolvedValue({ data: [] }),
      getProjectRuleSets: vi.fn(),
      createMyRuleSet: vi.fn(),
      createProjectRuleSet: vi.fn(),
      deleteRuleSet: vi.fn(),
      getRules: vi.fn().mockResolvedValue({ data: [] }),
      addRule: vi.fn(),
      updateRule: vi.fn(),
      deleteRule: vi.fn(),
    },
  },
}))

import { SettingsPage } from '../SettingsPage'

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  return render(<SettingsPage />, { wrapper })
}

describe('SettingsPage (ТП-150)', () => {
  it('секции-карточки с заголовками', () => {
    renderPage()
    expect(screen.getByText('Тема оформления')).toBeInTheDocument()
    expect(screen.getByText('Голосовой помощник')).toBeInTheDocument()
    // T-511: общие правила пользователя — набор без проекта (ADR-018).
    expect(screen.getByText('Общие правила')).toBeInTheDocument()
    expect(screen.getByText('Данные интерфейса')).toBeInTheDocument()
  })

  it('справочник команд свёрнут по умолчанию и раскрывается по запросу', () => {
    renderPage()
    // простыни каталога нет, пока не попросили
    expect(screen.queryByText('Что умеет — примеры фраз')).not.toBeInTheDocument()

    fireEvent.click(
      screen.getByRole('button', { name: /Справочник команд и примеры фраз/ }),
    )
    expect(screen.getByText('Что умеет — примеры фраз')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /Скрыть справочник команд/ }),
    ).toBeInTheDocument()
  })

  it('обучение — главный CTA секции голосового помощника', () => {
    renderPage()
    expect(
      screen.getByRole('button', { name: /Пройти обучение/ }),
    ).toBeInTheDocument()
  })
})
