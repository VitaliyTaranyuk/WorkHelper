import { describe, expect, it } from 'vitest'
import { isBoardSprintId } from '../board'

/**
 * T-202: какой спринт показывает доска.
 *
 * Функция кодирует правило **ADR-028**: доска показывает активный спринт, а
 * если активного нет — Backlog (это и есть kanban-режим). От неё зависит,
 * показывать ли у задачи поле «Статус»: у задач вне доскового спринта колонок
 * доски нет, и бэкенд выбор статуса отклоняет (ТП-74).
 *
 * Ошибка здесь не роняет экран — она даёт поле, которого не должно быть, или
 * прячет нужное. Ровно этот класс дал BUG-024 (рассинхрон статус↔спринт) и
 * BUG-029 (бэклог дублировался на доске).
 */

const sprint = (id: string, flags: { isActive?: boolean; isDefault?: boolean } = {}) => ({
  id,
  isActive: flags.isActive ?? false,
  isDefault: flags.isDefault ?? false,
})

describe('isBoardSprintId (T-202, ADR-028)', () => {
  const backlog = sprint('backlog', { isDefault: true })

  it('без спринта у задачи — не досковый', () => {
    expect(isBoardSprintId([backlog], undefined)).toBe(false)
  })

  it('активный спринт — досковый', () => {
    const active = sprint('s1', { isActive: true })
    expect(isBoardSprintId([backlog, active], 's1')).toBe(true)
  })

  it('неактивный спринт не становится досковым из-за наличия активного', () => {
    const active = sprint('s1', { isActive: true })
    const paused = sprint('s2')
    expect(isBoardSprintId([backlog, active, paused], 's2')).toBe(false)
  })

  it('без активного спринта досковым становится Backlog — это и есть kanban', () => {
    // ADR-028: режим включается отсутствием активного спринта либо явным
    // board_mode проекта; здесь закрепляется первая половина.
    expect(isBoardSprintId([backlog, sprint('s1')], 'backlog')).toBe(true)
  })

  it('при наличии активного спринта Backlog перестаёт быть досковым', () => {
    // Иначе задачи бэклога получили бы колонки доски — механизм BUG-029.
    const active = sprint('s1', { isActive: true })
    expect(isBoardSprintId([backlog, active], 'backlog')).toBe(false)
  })

  it('неизвестный спринт — не досковый', () => {
    expect(isBoardSprintId([backlog, sprint('s1', { isActive: true })], 'нет')).toBe(
      false,
    )
  })
})
