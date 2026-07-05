import { describe, it, expect } from 'vitest'
import { meetingCommand } from '../commands/meetingCommand'
import { commandRegistry } from '../commands'
import { createRuleBasedResolver } from '../../resolve/intentResolver'
import { makeCommandContext } from './fixtures'

describe('meetingCommand (ТП-104)', () => {
  it('создаёт встречу с названием и распознанным временем', async () => {
    const { ctx, createMeeting } = makeCommandContext()
    const res = meetingCommand.prepare(
      { q: 'Создай встречу обсуждение спринта завтра в 15' },
      ctx,
    )
    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(res.summary).toContain('Обсуждение спринта')
    await res.run(ctx)
    expect(createMeeting).toHaveBeenCalledOnce()
    const arg = createMeeting.mock.calls[0][0]
    expect(arg.title).toContain('Обсуждение спринта')
    expect(Number.isNaN(Date.parse(arg.startAt))).toBe(false)
    expect(arg.endAt).toBeTruthy()
  })

  it('без времени → уточнение «когда»', () => {
    const { ctx } = makeCommandContext()
    const res = meetingCommand.prepare({ q: 'Создай встречу планёрка' }, ctx)
    expect(res.ok).toBe(false)
    if (res.ok) return
    expect(res.clarification).toMatch(/когда/i)
  })

  it('без названия → уточнение «как назвать»', () => {
    const { ctx } = makeCommandContext()
    const res = meetingCommand.prepare({ q: 'Создай встречу завтра в 15' }, ctx)
    expect(res.ok).toBe(false)
    if (res.ok) return
    expect(res.clarification).toMatch(/назвать/i)
  })

  it('это confirm-команда', () => {
    expect(meetingCommand.riskLevel).toBe('confirm')
  })
})

describe('маршрутизация встреч', () => {
  const resolver = createRuleBasedResolver(commandRegistry)
  const { ctx } = makeCommandContext()

  it.each([
    ['Создай встречу планёрка завтра в 10', 'meeting.create'],
    ['Назначь созвон по релизу в пятницу в 15', 'meeting.create'],
    ['Создай спринт Релиз 2', 'sprint.create'],
    ['Создай задачу купить хлеб', 'task.create'],
  ])('«%s» → %s', async (phrase, id) => {
    expect((await resolver.resolve(phrase, ctx)).commandId).toBe(id)
  })
})
