import { beforeEach, describe, expect, it } from 'vitest'
import { useTaskSelectionStore } from '../model/taskSelectionStore'

/**
 * T-309: множественный выбор задач.
 *
 * Главное, что здесь проверяется, — не «чекбокс ставится», а два свойства,
 * из-за которых массовая операция иначе падала бы целиком: диапазон по Shift
 * и снятие отметок с задач, исчезнувших из данных. Бэкенд атомарен
 * (`findTasksInProject` бросает на первом же неизвестном id), поэтому один
 * устаревший id отменяет действие над всеми выбранными.
 */
describe('выбор задач (T-309)', () => {
  beforeEach(() => {
    useTaskSelectionStore.getState().clear()
  })

  const ids = ['t1', 't2', 't3', 't4', 't5']

  it('повторный клик снимает отметку', () => {
    const { toggle } = useTaskSelectionStore.getState()
    toggle('t1')
    expect(useTaskSelectionStore.getState().selectedIds).toEqual(['t1'])
    useTaskSelectionStore.getState().toggle('t1')
    expect(useTaskSelectionStore.getState().selectedIds).toEqual([])
  })

  it('Shift-клик выбирает диапазон от предыдущей отметки', () => {
    useTaskSelectionStore.getState().toggle('t2')
    useTaskSelectionStore.getState().selectRange('t4', ids)
    expect([...useTaskSelectionStore.getState().selectedIds].sort()).toEqual([
      't2',
      't3',
      't4',
    ])
  })

  it('диапазон работает и в обратную сторону', () => {
    useTaskSelectionStore.getState().toggle('t4')
    useTaskSelectionStore.getState().selectRange('t2', ids)
    expect([...useTaskSelectionStore.getState().selectedIds].sort()).toEqual([
      't2',
      't3',
      't4',
    ])
  })

  // Якорь из другой секции: индекс не найдётся в порядке этой секции.
  // Shift-клик тогда обязан вести себя как обычный, а не выбирать пол-списка.
  it('Shift-клик без якоря в этой секции просто добавляет задачу', () => {
    useTaskSelectionStore.getState().toggle('чужая-секция')
    useTaskSelectionStore.getState().selectRange('t3', ids)
    expect([...useTaskSelectionStore.getState().selectedIds].sort()).toEqual([
      't3',
      'чужая-секция',
    ])
  })

  it('исчезнувшие из данных задачи выпадают из выбора', () => {
    useTaskSelectionStore.getState().toggle('t1')
    useTaskSelectionStore.getState().toggle('t2')
    // t2 удалил другой пользователь — список перезапросился без неё.
    useTaskSelectionStore.getState().retain(new Set(['t1', 't3']))
    expect(useTaskSelectionStore.getState().selectedIds).toEqual(['t1'])
  })

  // Поллинг списков идёт каждые 10–15 с. Если retain менял бы ссылку на
  // массив всегда, подписчики перерисовывались бы на каждом ответе.
  it('retain не меняет состояние, когда ничего не отпало', () => {
    useTaskSelectionStore.getState().toggle('t1')
    const before = useTaskSelectionStore.getState().selectedIds
    useTaskSelectionStore.getState().retain(new Set(['t1', 't2']))
    expect(useTaskSelectionStore.getState().selectedIds).toBe(before)
  })

  it('якорь сбрасывается, если исчезла задача-якорь', () => {
    useTaskSelectionStore.getState().toggle('t1')
    useTaskSelectionStore.getState().toggle('t2')
    useTaskSelectionStore.getState().retain(new Set(['t1']))
    expect(useTaskSelectionStore.getState().anchorId).toBeNull()
  })
})
