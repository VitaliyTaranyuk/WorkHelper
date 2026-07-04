import { describe, it, expect } from 'vitest'
import { commentCommand } from '../commands/commentCommand'
import {
  sprintActivateCommand,
  sprintCreateCommand,
  sprintFinishCommand,
} from '../commands/sprintCommands'
import { notificationsReadCommand } from '../commands/notificationsCommand'
import { commandRegistry } from '../commands'
import { createRuleBasedResolver } from '../../resolve/intentResolver'
import { makeCommandContext } from './fixtures'

const openCtx = () =>
  makeCommandContext({ openTask: { id: 't1', code: 'ТП-90', title: 'ADR' } })

describe('commentCommand (C3)', () => {
  it('добавляет комментарий к открытой задаче', async () => {
    const { ctx, addComment } = openCtx()
    const res = commentCommand.prepare(
      { q: 'прокомментируй эту задачу нужно уточнить сроки' },
      ctx,
    )
    expect(res.ok).toBe(true)
    if (!res.ok) return
    await res.run(ctx)
    expect(addComment).toHaveBeenCalledWith('t1', expect.stringContaining('уточнить'))
  })

  it('без задачи и без открытой → уточнение', () => {
    const { ctx } = makeCommandContext()
    const res = commentCommand.prepare({ q: 'добавь комментарий готово' }, ctx)
    expect(res.ok).toBe(false)
  })

  it('пустой текст → уточнение', () => {
    const { ctx } = openCtx()
    expect(commentCommand.prepare({ q: 'прокомментируй эту задачу' }, ctx).ok).toBe(false)
  })
})

describe('sprintCreateCommand (C4)', () => {
  it('создаёт спринт с названием', async () => {
    const { ctx, createSprint } = makeCommandContext()
    const res = sprintCreateCommand.prepare({ name: 'Создай спринт Релиз 1' }, ctx)
    expect(res.ok).toBe(true)
    if (!res.ok) return
    await res.run(ctx)
    expect(createSprint).toHaveBeenCalledWith('Релиз 1')
  })

  it('без названия → уточнение', () => {
    const { ctx } = makeCommandContext()
    expect(sprintCreateCommand.prepare({ name: 'создай спринт' }, ctx).ok).toBe(false)
  })
})

describe('sprintActivateCommand (C4)', () => {
  it('активирует спринт по имени', async () => {
    const { ctx, activateSprint } = makeCommandContext()
    const res = sprintActivateCommand.prepare({ q: 'активируй спринт Спринт 1' }, ctx)
    expect(res.ok).toBe(true)
    if (!res.ok) return
    await res.run(ctx)
    expect(activateSprint).toHaveBeenCalledWith('s-active')
  })
})

describe('sprintFinishCommand (C4)', () => {
  it('завершает активный спринт («текущий»)', async () => {
    const { ctx, finishSprint } = makeCommandContext()
    const res = sprintFinishCommand.prepare({ q: 'заверши текущий спринт' }, ctx)
    expect(res.ok).toBe(true)
    if (!res.ok) return
    await res.run(ctx)
    expect(finishSprint).toHaveBeenCalledWith('s-active')
  })

  it('это destructive-команда', () => {
    expect(sprintFinishCommand.riskLevel).toBe('destructive')
  })
})

describe('notificationsReadCommand (C5)', () => {
  it('отмечает уведомления прочитанными', async () => {
    const { ctx, markNotificationsRead } = makeCommandContext()
    const res = notificationsReadCommand.prepare(
      { q: 'отметь уведомления прочитанными' },
      ctx,
    )
    expect(res.ok).toBe(true)
    if (!res.ok) return
    await res.run(ctx)
    expect(markNotificationsRead).toHaveBeenCalled()
  })
})

describe('маршрутизация C3-C5', () => {
  const resolver = createRuleBasedResolver(commandRegistry)
  const { ctx } = makeCommandContext()

  it.each([
    ['Прокомментируй эту задачу всё готово', 'task.comment'],
    ['Создай спринт Релиз 2', 'sprint.create'],
    ['Активируй спринт Релиз 2', 'sprint.activate'],
    ['Заверши текущий спринт', 'sprint.finish'],
    ['Отметь уведомления прочитанными', 'notifications.read'],
    ['Открой спринт', 'app.navigate'],
    // регрессия: создание спринта не должно попадать в перенос задачи
    ['Создай спринт Стабилизация', 'sprint.create'],
  ])('«%s» → %s', async (phrase, id) => {
    expect((await resolver.resolve(phrase, ctx)).commandId).toBe(id)
  })
})
