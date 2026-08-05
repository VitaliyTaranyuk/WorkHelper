import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

/**
 * T-514: выгрузка правил проекта в `AGENTS.md`.
 *
 * Проверяется не вёрстка, а три свойства: проект без наборов правил объясняет, что
 * выгружать нечего, и **не показывает кнопку**, которая заведомо получит отказ (K-32);
 * выгрузка запрашивается у проекта из пропса; предпросмотр показывает то самое
 * содержимое, которое уедет в репозиторий, вместе с пометкой «сгенерировано» (ADR-023).
 */

const getProjectRuleSets = vi.fn()
const exportAgentsMd = vi.fn()

vi.mock('@/shared/api/endpoint', () => ({
  workTechApi: {
    rule: {
      getMyRuleSets: vi.fn().mockResolvedValue({ data: [] }),
      getProjectRuleSets: (a: unknown) => getProjectRuleSets(a),
      createMyRuleSet: vi.fn(),
      createProjectRuleSet: vi.fn(),
      deleteRuleSet: vi.fn(),
      getRules: vi.fn().mockResolvedValue({ data: [] }),
      addRule: vi.fn(),
      updateRule: vi.fn(),
      deleteRule: vi.fn(),
      getReferenceSets: vi.fn().mockResolvedValue({ data: [] }),
      importReferenceIntoMy: vi.fn(),
      importReferenceIntoProject: vi.fn(),
      exportAgentsMd: (a: unknown) => exportAgentsMd(a),
    },
  },
}))

import { AgentsExportSection } from '../AgentsExportSection'

function wrapper(client: QueryClient) {
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
}

const SET = {
  id: 'set-1',
  projectId: 'p1',
  name: 'Ядро WorkHelper',
  description: null,
  version: 1,
  rulesCount: 46,
  createdAt: '2026-08-05T10:00:00',
}

const FILE_CONTENT = [
  '<!-- СГЕНЕРИРОВАНО WorkTask 2026-08-05 12:00 — НЕ РЕДАКТИРОВАТЬ ВРУЧНУЮ. -->',
  '',
  '# AGENTS.md — WorkTask',
  '',
  '| **K-01** | Одна задача = одна ветка | Ядро | процедура | MUST | всегда | полуавто |',
].join('\n')

describe('выгрузка AGENTS.md (T-514)', () => {
  let client: QueryClient

  beforeEach(() => {
    getProjectRuleSets.mockResolvedValue({ data: [SET] })
    exportAgentsMd.mockResolvedValue({
      data: {
        fileName: 'AGENTS.md',
        content: FILE_CONTENT,
        rulesCount: 46,
        generatedAt: '2026-08-05T12:00:00',
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

  /** K-32: кнопки, которая заведомо получит отказ сервера, быть не должно. */
  it('проект без наборов объясняет, что выгружать нечего, и не даёт кнопки', async () => {
    getProjectRuleSets.mockResolvedValue({ data: [] })

    render(<AgentsExportSection projectId="p1" />, { wrapper: wrapper(client) })

    expect(await screen.findByText(/Выгружать пока нечего/)).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Сформировать AGENTS.md' }),
    ).not.toBeInTheDocument()
  })

  it('выгрузка запрашивается у проекта из пропса', async () => {
    render(<AgentsExportSection projectId="project-from-url" />, {
      wrapper: wrapper(client),
    })

    fireEvent.click(
      await screen.findByRole('button', { name: 'Сформировать AGENTS.md' }),
    )

    await waitFor(() =>
      expect(exportAgentsMd).toHaveBeenCalledWith({ projectId: 'project-from-url' }),
    )
  })

  it('предпросмотр показывает содержимое файла с пометкой «сгенерировано»', async () => {
    render(<AgentsExportSection projectId="p1" />, { wrapper: wrapper(client) })

    fireEvent.click(
      await screen.findByRole('button', { name: 'Сформировать AGENTS.md' }),
    )

    const preview = await screen.findByLabelText('Предпросмотр AGENTS.md')
    expect(preview).toHaveTextContent('СГЕНЕРИРОВАНО WorkTask')
    expect(preview).toHaveTextContent('Одна задача = одна ветка')
    expect(screen.getByText(/Правил в файле: 46/)).toBeInTheDocument()
  })

  it('скачивание и копирование появляются только после выгрузки', async () => {
    render(<AgentsExportSection projectId="p1" />, { wrapper: wrapper(client) })
    await screen.findByRole('button', { name: 'Сформировать AGENTS.md' })

    expect(screen.queryByRole('button', { name: 'Скачать' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Сформировать AGENTS.md' }))

    expect(await screen.findByRole('button', { name: 'Скачать' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Скопировать' })).toBeInTheDocument()
  })
})
