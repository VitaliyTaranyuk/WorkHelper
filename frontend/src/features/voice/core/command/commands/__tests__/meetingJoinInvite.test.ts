import { describe, expect, it } from 'vitest'
import { meetingJoinCommand } from '../meetingJoinCommand'
import { meetingInviteCommand } from '../meetingInviteCommand'
import { makeCommandContext } from '../../__tests__/fixtures'

/**
 * M5 (ТП-165): голосовое подключение к встрече и приглашение участника.
 * Команды резолвят слоты локально, исполнение — через сервисы (моки).
 */
describe('meeting.join — «подключись к встрече»', () => {
  it('rule срабатывает на вариации глаголов и не срабатывает без встречи', () => {
    expect(meetingJoinCommand.rule!('подключись к встрече')).not.toBeNull()
    expect(meetingJoinCommand.rule!('открой встречу планёрка')).not.toBeNull()
    expect(meetingJoinCommand.rule!('войди во встречу')).not.toBeNull()
    expect(meetingJoinCommand.rule!('открой календарь')).toBeNull()
    expect(meetingJoinCommand.rule!('создай встречу завтра')).toBeNull()
  })

  it('название после «встречу» уходит запросом в openMeeting', async () => {
    const { ctx, openMeeting } = makeCommandContext()
    const prep = meetingJoinCommand.prepare(
      { q: 'подключись к встрече планёрка команды' },
      ctx,
    )
    if (!prep.ok) throw new Error('ожидалась готовность')
    expect(prep.summary).toContain('планёрка команды')

    const result = await prep.run(ctx)
    expect(openMeeting).toHaveBeenCalledWith('планёрка команды')
    expect(result.message).toContain('Открываю')
  })

  it('без названия — ближайшая встреча (query = undefined)', async () => {
    const { ctx, openMeeting } = makeCommandContext()
    const prep = meetingJoinCommand.prepare({ q: 'подключись к встрече' }, ctx)
    if (!prep.ok) throw new Error('ожидалась готовность')
    await prep.run(ctx)
    expect(openMeeting).toHaveBeenCalledWith(undefined)
  })
})

describe('meeting.invite — «пригласи … на встречу»', () => {
  it('rule выделяет человека и название встречи', () => {
    const match = meetingInviteCommand.rule!('пригласи Петрова на встречу планёрка')
    expect(match).not.toBeNull()
    expect(match!.slots.person).toBe('Петрова')
    expect(match!.slots.meeting).toBe('планёрка')
  })

  it('участник резолвится по составу проекта, приглашение уходит в сервис', async () => {
    const { ctx, inviteToMeeting } = makeCommandContext()
    const prep = meetingInviteCommand.prepare(
      { person: 'Петрова', meeting: 'планёрка' },
      ctx,
    )
    if (!prep.ok) throw new Error('ожидалась готовность')
    expect(prep.summary).toContain('Пётр Петров')

    await prep.run(ctx)
    expect(inviteToMeeting).toHaveBeenCalledWith(
      { id: 'u2', name: 'Пётр Петров' },
      'планёрка',
    )
  })

  it('неизвестный человек — уточнение, не выдумывание', () => {
    const { ctx } = makeCommandContext()
    const prep = meetingInviteCommand.prepare({ person: 'Сидорова' }, ctx)
    expect(prep.ok).toBe(false)
    if (!prep.ok) expect(prep.clarification).toContain('Сидорова')
  })
})
