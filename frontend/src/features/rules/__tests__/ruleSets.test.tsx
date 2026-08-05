import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

/**
 * T-511: правила как данные.
 *
 * Проверяется не вёрстка, а свойства: один и тот же раздел обслуживает два
 * уровня (общие правила пользователя и правила проекта) и обращается в разные
 * эндпоинты; пустой набор объясняет, что это норма (W-06, инвариант I-03);
 * неизвестное значение перечисления показывается как есть, а не роняет экран
 * (W-08); у системного правила нет кнопки удаления, потому что удалить его
 * нельзя — мёртвых кнопок в интерфейсе быть не должно (K-32).
 */

const getMyRuleSets = vi.fn()
const getProjectRuleSets = vi.fn()
const createMyRuleSet = vi.fn()
const createProjectRuleSet = vi.fn()
const deleteRuleSet = vi.fn()
const getRules = vi.fn()
const addRule = vi.fn()
const updateRule = vi.fn()
const deleteRule = vi.fn()

vi.mock('@/shared/api/endpoint', () => ({
  workTechApi: {
    rule: {
      getMyRuleSets: (a: unknown) => getMyRuleSets(a),
      getProjectRuleSets: (a: unknown) => getProjectRuleSets(a),
      createMyRuleSet: (a: unknown) => createMyRuleSet(a),
      createProjectRuleSet: (a: unknown) => createProjectRuleSet(a),
      deleteRuleSet: (a: unknown) => deleteRuleSet(a),
      getRules: (a: unknown) => getRules(a),
      addRule: (a: unknown) => addRule(a),
      updateRule: (a: unknown) => updateRule(a),
      deleteRule: (a: unknown) => deleteRule(a),
    },
  },
}))

import { RuleSetsSection } from '../RuleSetsSection'

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
  rulesCount: 1,
  createdAt: '2026-08-05T10:00:00',
}

const RULE = {
  id: 'r1',
  code: 'K-01',
  level: 'CORE',
  kind: 'PROCEDURE',
  strength: 'MUST',
  triggerCondition: 'всегда',
  verification: 'MANUAL',
  body: 'Одна задача = одна ветка',
  sourceRuleId: null,
  systemRule: false,
}

describe('наборы правил (T-511)', () => {
  let client: QueryClient

  beforeEach(() => {
    getMyRuleSets.mockResolvedValue({ data: [] })
    getProjectRuleSets.mockResolvedValue({ data: [] })
    getRules.mockResolvedValue({ data: [] })
    createProjectRuleSet.mockResolvedValue({ data: SET })
    createMyRuleSet.mockResolvedValue({ data: { ...SET, projectId: null } })
    addRule.mockResolvedValue({ data: RULE })
    client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
    client.clear()
  })

  it('проект без наборов объясняет это, а не молчит', async () => {
    render(<RuleSetsSection projectId="p1" />, { wrapper: wrapper(client) })

    await waitFor(() =>
      expect(screen.getByText(/Наборов правил нет/)).toBeInTheDocument(),
    )
    // Именно «нормально», а не «ошибка»: набор необязателен (I-03).
    expect(screen.getByText(/Это нормально/)).toBeInTheDocument()
  })

  it('наборы проекта запрашиваются у проекта из пропса', async () => {
    render(<RuleSetsSection projectId="project-from-url" />, {
      wrapper: wrapper(client),
    })

    await waitFor(() =>
      expect(getProjectRuleSets).toHaveBeenCalledWith({
        projectId: 'project-from-url',
      }),
    )
    expect(getMyRuleSets).not.toHaveBeenCalled()
  })

  it('без проекта раздел работает с общими наборами пользователя', async () => {
    render(<RuleSetsSection />, { wrapper: wrapper(client) })

    await waitFor(() => expect(getMyRuleSets).toHaveBeenCalled())
    expect(getProjectRuleSets).not.toHaveBeenCalled()
    expect(screen.getByText('Общие правила')).toBeInTheDocument()
  })

  it('создание набора уходит в проект из пропса', async () => {
    render(<RuleSetsSection projectId="p1" />, { wrapper: wrapper(client) })
    await screen.findByText(/Наборов правил нет/)

    fireEvent.change(screen.getByLabelText('Название набора'), {
      target: { value: 'Ядро WorkHelper' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Создать набор' }))

    await waitFor(() =>
      expect(createProjectRuleSet).toHaveBeenCalledWith({
        projectId: 'p1',
        data: { name: 'Ядро WorkHelper' },
      }),
    )
  })

  it('правила набора показываются после раскрытия', async () => {
    getProjectRuleSets.mockResolvedValue({ data: [SET] })
    getRules.mockResolvedValue({ data: [RULE] })

    render(<RuleSetsSection projectId="p1" />, { wrapper: wrapper(client) })
    fireEvent.click(await screen.findByRole('button', { name: /Правила/ }))

    await waitFor(() => expect(getRules).toHaveBeenCalledWith({ ruleSetId: 'set-1' }))
    expect(await screen.findByText('Одна задача = одна ветка')).toBeInTheDocument()
    expect(screen.getByText(/Процедура · всегда · проверка: ручная/)).toBeInTheDocument()
  })

  /**
   * W-08: перечисления расширяются аддитивно. Незнакомое значение обязано
   * доехать до экрана как есть — маппер, бросавший на новом типе задачи,
   * когда-то обнулил целый экран.
   */
  it('неизвестное значение перечисления показывается, а не роняет экран', async () => {
    getProjectRuleSets.mockResolvedValue({ data: [SET] })
    getRules.mockResolvedValue({
      data: [{ ...RULE, level: 'EXPERIMENTAL', kind: 'CHECKLIST' }],
    })

    render(<RuleSetsSection projectId="p1" />, { wrapper: wrapper(client) })
    fireEvent.click(await screen.findByRole('button', { name: /Правила/ }))

    expect(await screen.findByText('EXPERIMENTAL')).toBeInTheDocument()
    expect(screen.getByText(/CHECKLIST/)).toBeInTheDocument()
  })

  /** K-32: кнопки, которая заведомо получит отказ, в интерфейсе быть не должно. */
  it('у системного правила нет кнопки удаления, а у обычного есть', async () => {
    getProjectRuleSets.mockResolvedValue({ data: [{ ...SET, rulesCount: 2 }] })
    getRules.mockResolvedValue({
      data: [RULE, { ...RULE, id: 'r2', code: 'K-02', systemRule: true }],
    })

    render(<RuleSetsSection projectId="p1" />, { wrapper: wrapper(client) })
    fireEvent.click(await screen.findByRole('button', { name: /Правила/ }))

    await screen.findByLabelText('Удалить правило K-01')
    expect(screen.queryByLabelText('Удалить правило K-02')).not.toBeInTheDocument()
    // Редактировать системное правило можно — набор должен подстраиваться под проект.
    expect(screen.getByLabelText('Изменить правило K-02')).toBeInTheDocument()
  })

  it('новое правило отправляется с заполненной формой', async () => {
    getProjectRuleSets.mockResolvedValue({ data: [SET] })

    render(<RuleSetsSection projectId="p1" />, { wrapper: wrapper(client) })
    fireEvent.click(await screen.findByRole('button', { name: /Правила/ }))
    fireEvent.click(await screen.findByRole('button', { name: 'Добавить правило' }))

    const dialog = await screen.findByRole('dialog')
    fireEvent.change(within(dialog).getByLabelText('Код'), {
      target: { value: 'K-27' },
    })
    fireEvent.change(within(dialog).getByLabelText('Формулировка'), {
      target: { value: 'Ошибка исправляется через первопричину' },
    })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Сохранить' }))

    await waitFor(() =>
      expect(addRule).toHaveBeenCalledWith({
        ruleSetId: 'set-1',
        data: {
          code: 'K-27',
          level: 'CORE',
          kind: 'PROCEDURE',
          strength: 'MUST',
          triggerCondition: 'всегда',
          verification: 'MANUAL',
          body: 'Ошибка исправляется через первопричину',
        },
      }),
    )
  })

  it('пустое название не даёт создать набор', async () => {
    render(<RuleSetsSection projectId="p1" />, { wrapper: wrapper(client) })
    await screen.findByText(/Наборов правил нет/)

    expect(screen.getByRole('button', { name: 'Создать набор' })).toBeDisabled()
    expect(createProjectRuleSet).not.toHaveBeenCalled()
  })
})
