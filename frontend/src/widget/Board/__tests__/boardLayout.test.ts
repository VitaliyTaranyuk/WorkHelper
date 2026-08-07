import { describe, expect, it } from 'vitest'
import type { ITaskCard, TaskStatus } from '@/entities/task/types'
import { getTasksByStatus, updateTasksByStatus } from '../utils'

/**
 * T-202: раскладка карточек по колонкам доски.
 *
 * `Board.tsx` — самый крупный компонент приложения (654 строки) и до T-201 был
 * покрыт нулём тестов, при том что четыре бага из восьми, найденных T-100,
 * жили именно здесь: BUG-024 (рассинхрон статус↔спринт), BUG-029 (бэклог
 * дублировался на доске), BUG-033 и BUG-034 (завершающая колонка).
 *
 * Здесь закрепляются не «рендерится ли доска», а три свойства, нарушение
 * которых и давало те баги:
 *   1. задача со статусом вне колонок проекта на доску НЕ попадает
 *      (доменное требование: «никаких backlog-элементов внутри доски»);
 *   2. пустая колонка остаётся видимой, а не исчезает вместе с задачами;
 *   3. порядок внутри колонки задаётся `position`, а не порядком прихода.
 */

const status = (id: number, code: string): TaskStatus =>
  ({ id, code, priority: id, viewed: true, projectId: 'p1' }) as TaskStatus

const task = (id: string, statusId: number, position: number): ITaskCard =>
  ({
    id,
    code: `ТП-${id}`,
    title: `Задача ${id}`,
    status: { id: statusId, code: 'x' },
    position,
    sprintId: 's1',
  }) as ITaskCard

describe('getTasksByStatus (T-202)', () => {
  it('без колонок проекта возвращает пустую карту, а не падает', () => {
    // Класс TD-031: экран проекта без колонок обваливался в ErrorBoundary,
    // потому что вычисление не имело безопасного значения на пустом входе.
    expect(getTasksByStatus({ projectStatuses: undefined, tasks: [] }).size).toBe(0)
  })

  it('раскладывает задачи по своим колонкам', () => {
    const map = getTasksByStatus({
      projectStatuses: [status(1, 'To Do'), status(2, 'Done')],
      tasks: [task('a', 1, 0), task('b', 2, 0), task('c', 1, 1)],
    })

    expect(map.get(1)?.map((t) => t.id)).toEqual(['a', 'c'])
    expect(map.get(2)?.map((t) => t.id)).toEqual(['b'])
  })

  it('задача со статусом вне колонок проекта на доску не попадает', () => {
    // Доменное требование: элементы backlog не показываются в рабочих колонках
    // доски. Механизм ровно этот — статус, которого нет среди колонок, молча
    // отбрасывается. Именно его поломка давала BUG-029.
    const map = getTasksByStatus({
      projectStatuses: [status(1, 'To Do')],
      tasks: [task('a', 1, 0), task('backlog', 99, 0)],
    })

    expect([...map.values()].flat().map((t) => t.id)).toEqual(['a'])
  })

  it('колонка без задач остаётся в карте пустой, а не пропадает', () => {
    const map = getTasksByStatus({
      projectStatuses: [status(1, 'To Do'), status(2, 'Done')],
      tasks: [task('a', 1, 0)],
    })

    expect(map.has(2)).toBe(true)
    expect(map.get(2)).toEqual([])
  })

  it('внутри колонки порядок задаётся position, а не порядком прихода', () => {
    const map = getTasksByStatus({
      projectStatuses: [status(1, 'To Do')],
      tasks: [task('third', 1, 2), task('first', 1, 0), task('second', 1, 1)],
    })

    expect(map.get(1)?.map((t) => t.id)).toEqual(['first', 'second', 'third'])
  })
})

describe('updateTasksByStatus (T-202)', () => {
  const base = () =>
    getTasksByStatus({
      projectStatuses: [status(1, 'To Do'), status(2, 'Done')],
      tasks: [task('a', 1, 0), task('b', 1, 1)],
    })

  it('переносит задачу между колонками', () => {
    const next = updateTasksByStatus({
      tasksByStatus: base(),
      taskId: 'a',
      oldStatusId: 1,
      newStatusId: 2,
    })

    expect(next.get(1)?.map((t) => t.id)).toEqual(['b'])
    expect(next.get(2)?.map((t) => t.id)).toEqual(['a'])
  })

  it('не мутирует исходную карту', () => {
    // Мутация общей структуры давала бы рассинхрон между тем, что показано,
    // и тем, что отправлено на сервер.
    const original = base()
    updateTasksByStatus({
      tasksByStatus: original,
      taskId: 'a',
      oldStatusId: 1,
      newStatusId: 2,
    })

    expect(original.get(1)?.map((t) => t.id)).toEqual(['a', 'b'])
    expect(original.get(2)).toEqual([])
  })

  it('на неизвестной задаче возвращает копию, а не теряет колонки', () => {
    const next = updateTasksByStatus({
      tasksByStatus: base(),
      taskId: 'нет-такой',
      oldStatusId: 1,
      newStatusId: 2,
    })

    expect(next.get(1)?.map((t) => t.id)).toEqual(['a', 'b'])
    expect(next.has(2)).toBe(true)
  })
})
