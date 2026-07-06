import { describe, expect, it } from 'vitest'
import { pickMeeting } from '../meetingPick'
import type { MeetingDto } from '@/shared/api/endpoint/meetingsApi'

const NOW = +new Date('2026-07-06T12:00:00')

const meeting = (
  id: string,
  title: string,
  startAt: string,
  extra?: Partial<MeetingDto>,
): MeetingDto => ({
  id,
  title,
  startAt,
  endAt: null,
  link: 'https://host/meet/tok-' + id,
  participants: [],
  ...extra,
})

describe('pickMeeting — выбор встречи для голосовых команд (M5)', () => {
  it('идущая сейчас важнее ближайшей предстоящей', () => {
    const picked = pickMeeting(
      [
        meeting('a', 'Планёрка', '2026-07-06T11:30:00'), // идёт (до 12:30)
        meeting('b', 'Ретро', '2026-07-06T13:00:00'),
      ],
      undefined,
      NOW,
    )
    expect(picked?.id).toBe('a')
  })

  it('без идущей — ближайшая предстоящая', () => {
    const picked = pickMeeting(
      [
        meeting('late', 'Вечерняя', '2026-07-06T18:00:00'),
        meeting('soon', 'Дневная', '2026-07-06T14:00:00'),
      ],
      undefined,
      NOW,
    )
    expect(picked?.id).toBe('soon')
  })

  it('название фильтрует с учётом словоформ («планёрку» → «Планёрка»)', () => {
    const picked = pickMeeting(
      [
        meeting('a', 'Планёрка команды', '2026-07-06T14:00:00'),
        meeting('b', 'Ретро спринта', '2026-07-06T13:00:00'),
      ],
      'планерку',
      NOW,
    )
    expect(picked?.id).toBe('a')
  })

  it('requireLink отбрасывает встречи без ссылки', () => {
    const picked = pickMeeting(
      [
        meeting('nolink', 'Планёрка', '2026-07-06T13:00:00', { link: null }),
        meeting('linked', 'Планёрка вторая', '2026-07-06T15:00:00'),
      ],
      undefined,
      NOW,
      { requireLink: true },
    )
    expect(picked?.id).toBe('linked')
  })

  it('прошедшие не предлагаются без явного названия', () => {
    const past = meeting('p', 'Планёрка', '2026-07-06T09:00:00')
    expect(pickMeeting([past], undefined, NOW)).toBeNull()
    // но при явном единственном совпадении по названию — берётся
    expect(pickMeeting([past], 'планерка', NOW)?.id).toBe('p')
  })

  it('пусто — null', () => {
    expect(pickMeeting([], undefined, NOW)).toBeNull()
  })
})
