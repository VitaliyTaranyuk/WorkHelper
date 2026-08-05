import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

/**
 * T-515: процесс задачи как переносимая сущность.
 *
 * Проверяется не вёрстка, а свойства: процесс запрашивается у проекта из пропса; пустой
 * процесс объясняет, что это норма (W-06, инвариант I-03), и предлагает завести его
 * **явной командой** (условие 4 ADR-027); стрелки на краях списка выключены, а не
 * молча ничего не делают (K-32).
 */

const getProcessSteps = vi.fn()
const createProcessStep = vi.fn()
const createDefaultProcessSteps = vi.fn()
const moveProcessStep = vi.fn()
const deleteProcessStep = vi.fn()

vi.mock('@/shared/api/endpoint', () => ({
  workTechApi: {
    processStep: {
      getProcessSteps: (a: unknown) => getProcessSteps(a),
      createProcessStep: (a: unknown) => createProcessStep(a),
      createDefaultProcessSteps: (a: unknown) => createDefaultProcessSteps(a),
      moveProcessStep: (a: unknown) => moveProcessStep(a),
      deleteProcessStep: (a: unknown) => deleteProcessStep(a),
    },
  },
}))

import { ProcessStepsSection } from '../ProcessStepsSection'

function wrapper(client: QueryClient) {
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
}

const STEPS = [
  { id: 's1', code: 'A0', name: 'Актуальность', description: null, position: 1 },
  { id: 's2', code: 'A1', name: 'Анализ', description: null, position: 2 },
  { id: 's3', code: 'V', name: 'Верификация', description: null, position: 3 },
]

describe('процесс задачи (T-515)', () => {
  let client: QueryClient

  beforeEach(() => {
    getProcessSteps.mockResolvedValue({ data: [] })
    createProcessStep.mockResolvedValue({ data: STEPS[0] })
    createDefaultProcessSteps.mockResolvedValue({ data: STEPS })
    moveProcessStep.mockResolvedValue({ data: STEPS })
    client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
    client.clear()
  })

  it('проект без процесса объясняет это, а не молчит', async () => {
    render(<ProcessStepsSection projectId="p1" />, { wrapper: wrapper(client) })

    expect(await screen.findByText(/Процесс не задан/)).toBeInTheDocument()
    // Именно «нормально», а не «ошибка»: этапы необязательны (I-03).
    expect(screen.getByText(/Это нормально/)).toBeInTheDocument()
  })

  it('процесс запрашивается у проекта из пропса', async () => {
    render(<ProcessStepsSection projectId="project-from-url" />, {
      wrapper: wrapper(client),
    })

    await waitFor(() =>
      expect(getProcessSteps).toHaveBeenCalledWith({ projectId: 'project-from-url' }),
    )
  })

  /** Условие 4 ADR-027: этапы появляются по явной команде, а не сами. */
  it('дефолтный процесс заводится явной командой', async () => {
    render(<ProcessStepsSection projectId="p1" />, { wrapper: wrapper(client) })

    fireEvent.click(
      await screen.findByRole('button', { name: /Завести процесс по умолчанию/ }),
    )

    await waitFor(() =>
      expect(createDefaultProcessSteps).toHaveBeenCalledWith({ projectId: 'p1' }),
    )
  })

  it('этапы показаны по порядку с кодом и названием', async () => {
    getProcessSteps.mockResolvedValue({ data: STEPS })

    render(<ProcessStepsSection projectId="p1" />, { wrapper: wrapper(client) })

    expect(await screen.findByText(/Актуальность/)).toBeInTheDocument()
    expect(screen.getByText(/Верификация/)).toBeInTheDocument()
    // Раз процесс есть, предлагать «завести по умолчанию» уже незачем.
    expect(
      screen.queryByRole('button', { name: /Завести процесс по умолчанию/ }),
    ).not.toBeInTheDocument()
  })

  /** K-32: кнопка, которая ничего не сделает, должна быть выключена, а не молчать. */
  it('стрелки на краях процесса выключены', async () => {
    getProcessSteps.mockResolvedValue({ data: STEPS })

    render(<ProcessStepsSection projectId="p1" />, { wrapper: wrapper(client) })

    expect(await screen.findByLabelText('Поднять этап A0')).toBeDisabled()
    expect(screen.getByLabelText('Опустить этап V')).toBeDisabled()
    expect(screen.getByLabelText('Опустить этап A0')).toBeEnabled()
  })

  it('перестановка уходит с направлением', async () => {
    getProcessSteps.mockResolvedValue({ data: STEPS })

    render(<ProcessStepsSection projectId="p1" />, { wrapper: wrapper(client) })
    fireEvent.click(await screen.findByLabelText('Поднять этап A1'))

    await waitFor(() =>
      expect(moveProcessStep).toHaveBeenCalledWith({
        projectId: 'p1',
        stepId: 's2',
        up: true,
      }),
    )
  })

  it('новый этап отправляется с кодом и названием', async () => {
    render(<ProcessStepsSection projectId="p1" />, { wrapper: wrapper(client) })
    await screen.findByText(/Процесс не задан/)

    fireEvent.change(screen.getByLabelText('Код этапа'), { target: { value: 'X' } })
    fireEvent.change(screen.getByLabelText('Название этапа'), {
      target: { value: 'Приёмка' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Добавить этап' }))

    await waitFor(() =>
      expect(createProcessStep).toHaveBeenCalledWith({
        projectId: 'p1',
        data: { code: 'X', name: 'Приёмка' },
      }),
    )
  })

  it('пустые поля не дают добавить этап', async () => {
    render(<ProcessStepsSection projectId="p1" />, { wrapper: wrapper(client) })
    await screen.findByText(/Процесс не задан/)

    expect(screen.getByRole('button', { name: 'Добавить этап' })).toBeDisabled()
    expect(createProcessStep).not.toHaveBeenCalled()
  })
})
