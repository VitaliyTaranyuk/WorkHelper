import { describe, it, expect } from 'vitest'
import dayjs from 'dayjs'
import { parseRussianDateTime } from '../dateTime'

// Фиксированное «сейчас»: среда 08.07.2026, 12:00 (детерминизм тестов).
const NOW = new Date(2026, 6, 8, 12, 0, 0)

describe('parseRussianDateTime', () => {
  it('«завтра в 15» → следующий день 15:00', () => {
    const { at } = parseRussianDateTime('завтра в 15', NOW)
    const d = dayjs(at!)
    expect(d.date()).toBe(9)
    expect(d.hour()).toBe(15)
    expect(d.minute()).toBe(0)
  })

  it('«сегодня в 14:30» → сегодня 14:30', () => {
    const { at } = parseRussianDateTime('сегодня в 14:30', NOW)
    const d = dayjs(at!)
    expect(d.date()).toBe(8)
    expect(d.hour()).toBe(14)
    expect(d.minute()).toBe(30)
  })

  it('только время в прошлом → переносится на завтра', () => {
    const { at } = parseRussianDateTime('в 9 утра', NOW) // 09:00 сегодня уже прошло
    const d = dayjs(at!)
    expect(d.date()).toBe(9)
    expect(d.hour()).toBe(9)
  })

  it('«послезавтра в 11» → +2 дня 11:00', () => {
    const { at } = parseRussianDateTime('послезавтра в 11', NOW)
    const d = dayjs(at!)
    expect(d.date()).toBe(10)
    expect(d.hour()).toBe(11)
  })

  it('daypart: «в 7 вечера» → 19:00', () => {
    const { at } = parseRussianDateTime('завтра в 7 вечера', NOW)
    expect(dayjs(at!).hour()).toBe(19)
  })

  it('день недели: «в пятницу в 10» → ближайшая пятница 10:00', () => {
    const { at } = parseRussianDateTime('в пятницу в 10', NOW)
    const d = dayjs(at!)
    expect(d.day()).toBe(5)
    expect(d.hour()).toBe(10)
    expect(d.isAfter(dayjs(NOW))).toBe(true)
  })

  it('день без времени → дефолт 10:00', () => {
    const { at } = parseRussianDateTime('завтра', NOW)
    expect(dayjs(at!).hour()).toBe(10)
  })

  it('нет даты/времени → at null, rest = исходный текст', () => {
    const { at, rest } = parseRussianDateTime('обсуждение спринта', NOW)
    expect(at).toBeNull()
    expect(rest).toContain('обсуждение')
  })

  it('rest очищается от даты/времени и слова «встречу»', () => {
    const { rest } = parseRussianDateTime('встречу обсуждение спринта завтра в 15', NOW)
    expect(rest).toContain('обсуждение спринта')
    expect(rest).not.toMatch(/завтра|встречу|в 15/)
  })
})
