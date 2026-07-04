import { describe, it, expect, vi } from 'vitest'
import { createTaskCommand } from '../commands/createTaskCommand'
import type { CreatedTask, VoiceCommandContext } from '../types'
import { makeContext } from './fixtures'

function servicesWith(created: CreatedTask) {
  const createTask = vi.fn(async () => created)
  const navigate = vi.fn()
  const ctx: VoiceCommandContext = { ...makeContext(), createTask, navigate }
  return { ctx, createTask, navigate }
}

describe('createTaskCommand.prepare', () => {
  const ctx = makeContext()

  it('делит текст на название и описание', () => {
    const res = createTaskCommand.prepare(
      { content: 'Подготовить отчёт. Нужны цифры за квартал.' },
      ctx,
    )
    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(res.summary).toContain('Подготовить отчёт')
    expect(res.summary).toContain('с описанием')
  })

  it('короткое название → уточнение (не выдумывает)', () => {
    const res = createTaskCommand.prepare({ content: 'ок' }, ctx)
    expect(res.ok).toBe(false)
    if (res.ok) return
    expect(res.clarification).toMatch(/название/i)
  })

  it('пустой слот → уточнение', () => {
    expect(createTaskCommand.prepare({}, ctx).ok).toBe(false)
  })

  it('run создаёт задачу через сервис createTask в спринте по умолчанию', async () => {
    const { ctx: services, createTask } = servicesWith({
      id: 't1',
      code: 'ТП-200',
      title: 'Купить хлеб',
    })
    const res = createTaskCommand.prepare({ content: 'Купить хлеб' }, ctx)
    expect(res.ok).toBe(true)
    if (!res.ok) return

    const result = await res.run(services)

    expect(createTask).toHaveBeenCalledOnce()
    expect(createTask).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Купить хлеб',
        taskType: 'TASK',
        priority: 'MEDIUM',
        sprintId: 's-backlog',
      }),
    )
    expect(result.taskCode).toBe('ТП-200')
    expect(result.message).toContain('ТП-200')
  })

  it('передаёт описание, если оно есть', async () => {
    const { ctx: services, createTask } = servicesWith({
      id: 't2',
      code: 'ТП-201',
      title: 'Починить логин',
    })
    const res = createTaskCommand.prepare(
      { content: 'Починить логин. Падает на проде.' },
      ctx,
    )
    if (!res.ok) throw new Error('ожидался ok')
    await res.run(services)
    expect(createTask).toHaveBeenCalledWith(
      expect.objectContaining({ description: expect.stringContaining('проде') }),
    )
  })

  it('это safe-команда', () => {
    expect(createTaskCommand.riskLevel).toBe('safe')
  })
})
