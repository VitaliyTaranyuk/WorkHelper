import { describe, it, expect, vi } from 'vitest'
import { createBugCommand } from '../commands/createBugCommand'
import { openTaskCommand } from '../commands/openTaskCommand'
import {
  statusCommand,
  sprintCommand,
  priorityCommand,
  assigneeCommand,
} from '../commands/attributeCommands'
import { commandRegistry } from '../commands'
import { createRuleBasedResolver } from '../../resolve/intentResolver'
import { makeContext } from './fixtures'
import type { VoiceCommandContext, VoiceContext } from '../types'

function makeServices(ctx: VoiceContext): {
  ctx: VoiceCommandContext
  setStatus: ReturnType<typeof vi.fn>
  setSprint: ReturnType<typeof vi.fn>
  patchTask: ReturnType<typeof vi.fn>
  findTask: ReturnType<typeof vi.fn>
  createTask: ReturnType<typeof vi.fn>
  navigate: ReturnType<typeof vi.fn>
} {
  const setStatus = vi.fn(async () => {})
  const setSprint = vi.fn(async () => {})
  const patchTask = vi.fn(async (code: string) => ({ id: 'x', code, title: 't' }))
  const findTask = vi.fn(async (code: string) => ({ id: `id-${code}`, code, title: 't' }))
  const createTask = vi.fn(async () => ({ id: 'nt', code: 'ТП-500', title: 'Баг' }))
  const navigate = vi.fn()
  return {
    ctx: { ...ctx, setStatus, setSprint, patchTask, findTask, createTask, navigate },
    setStatus,
    setSprint,
    patchTask,
    findTask,
    createTask,
    navigate,
  }
}

const openCtx = makeContext({
  openTask: { id: 't1', code: 'ТП-90', title: 'ADR' },
})

describe('createBugCommand', () => {
  it('создаёт баг (taskType BUG)', async () => {
    const res = createBugCommand.prepare({ content: 'Заведи баг не грузится доска' }, makeContext())
    expect(res.ok).toBe(true)
    if (!res.ok) return
    const { ctx, createTask } = makeServices(makeContext())
    await res.run(ctx)
    expect(createTask).toHaveBeenCalledWith(
      expect.objectContaining({ taskType: 'BUG' }),
    )
  })
})

describe('openTaskCommand', () => {
  it('открывает задачу по коду', async () => {
    const res = openTaskCommand.prepare({ q: 'Открой задачу ТП-90' }, makeContext())
    expect(res.ok).toBe(true)
    if (!res.ok) return
    const { ctx, navigate } = makeServices(makeContext())
    await res.run(ctx)
    expect(navigate).toHaveBeenCalledWith({ kind: 'task', code: 'ТП-90' })
  })
})

describe('statusCommand (C2)', () => {
  it('«переведи эту задачу в готово» → setStatus по открытой задаче', async () => {
    const res = statusCommand.prepare({ q: 'переведи эту задачу в готово' }, openCtx)
    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(res.summary).toContain('Done') // «готово» → статус Done (label)
    const { ctx, setStatus } = makeServices(openCtx)
    const out = await res.run(ctx)
    expect(setStatus).toHaveBeenCalledWith('t1', 4) // Done id 4
    expect(out.taskCode).toBe('ТП-90')
  })

  it('по коду задачи (без открытой) → findTask + setStatus', async () => {
    const res = statusCommand.prepare({ q: 'переведи ТП-91 в работу' }, makeContext())
    expect(res.ok).toBe(true)
    if (!res.ok) return
    const { ctx, findTask, setStatus } = makeServices(makeContext())
    await res.run(ctx)
    expect(findTask).toHaveBeenCalledWith('ТП-91')
    expect(setStatus).toHaveBeenCalledWith('id-ТП-91', 2) // In Progress
  })

  it('нет задачи и нет открытой → уточнение', () => {
    const res = statusCommand.prepare({ q: 'переведи в готово' }, makeContext())
    expect(res.ok).toBe(false)
  })

  it('статус не распознан → уточнение', () => {
    const res = statusCommand.prepare({ q: 'переведи эту задачу в нечто' }, openCtx)
    expect(res.ok).toBe(false)
  })

  it('это confirm-команда', () => {
    expect(statusCommand.riskLevel).toBe('confirm')
  })
})

describe('sprintCommand / priorityCommand / assigneeCommand (C2)', () => {
  it('спринт: «перенеси эту задачу в текущий спринт»', async () => {
    const res = sprintCommand.prepare({ q: 'перенеси эту задачу в текущий спринт' }, openCtx)
    expect(res.ok).toBe(true)
    if (!res.ok) return
    const { ctx, setSprint } = makeServices(openCtx)
    await res.run(ctx)
    expect(setSprint).toHaveBeenCalledWith('t1', 's-active')
  })

  it('приоритет: «сделай эту задачу высоким приоритетом»', async () => {
    const res = priorityCommand.prepare(
      { q: 'сделай эту задачу высоким приоритетом' },
      openCtx,
    )
    expect(res.ok).toBe(true)
    if (!res.ok) return
    const { ctx, patchTask } = makeServices(openCtx)
    await res.run(ctx)
    expect(patchTask).toHaveBeenCalledWith('ТП-90', { priority: 'HIGH' })
  })

  it('исполнитель: «назначь эту задачу на Иванова»', async () => {
    const res = assigneeCommand.prepare({ q: 'назначь эту задачу на Иванова' }, openCtx)
    expect(res.ok).toBe(true)
    if (!res.ok) return
    const { ctx, patchTask } = makeServices(openCtx)
    await res.run(ctx)
    expect(patchTask).toHaveBeenCalledWith('ТП-90', { assignee: 'u1' })
  })
})

describe('маршрутизация правил реестра', () => {
  const resolver = createRuleBasedResolver(commandRegistry)
  const ctx = makeContext()

  it.each([
    ['Заведи баг не грузится доска', 'task.bug'],
    ['Открой задачу ТП-90', 'task.open'],
    ['Переведи эту задачу в готово', 'task.status'],
    ['Перенеси эту задачу в бэклог', 'task.sprint'],
    ['Поставь высокий приоритет этой задаче', 'task.priority'],
    ['Назначь эту задачу на Иванова', 'task.assignee'],
    ['Создай задачу купить хлеб', 'task.create'],
    ['Открой доску', 'app.navigate'],
    ['Открой задачи', 'app.navigate'],
  ])('«%s» → %s', async (phrase, id) => {
    const r = await resolver.resolve(phrase, ctx)
    expect(r.commandId).toBe(id)
  })
})
