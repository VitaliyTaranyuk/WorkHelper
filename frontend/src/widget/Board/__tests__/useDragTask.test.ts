import { describe, expect, it, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import type { DropResult } from '@hello-pangea/dnd'
import type { ITaskCard } from '@/entities/task/types'
import type { StatusTasksMap } from '../Board'
import { useDragTask } from '../useDragTask'

/**
 * T-202: перетаскивание карточки на доске.
 *
 * `onReorder` персистит и колонку, и порядок — то есть каждый лишний вызов
 * это лишняя запись на сервер, а каждый пропущенный — потерянное действие
 * пользователя. Здесь закрепляются обе границы: когда обработчик обязан
 * промолчать и что именно он отправляет, когда срабатывает.
 *
 * Жест намеренно одиночный: T-309 вывела множественный выбор только в «Списке
 * задач», а DnD на доске остаётся операцией над одной карточкой (K-23).
 */

const task = (id: string, position: number): ITaskCard =>
  ({ id, code: `ТП-${id}`, title: id, position, sprintId: 's1' }) as ITaskCard

const map = (): StatusTasksMap =>
  new Map([
    [1, [task('a', 0), task('b', 1)]],
    [2, [task('c', 0)]],
  ])

const drop = (
  from: { col: number; index: number },
  to?: { col: number; index: number },
): DropResult =>
  ({
    source: { droppableId: String(from.col), index: from.index },
    destination: to ? { droppableId: String(to.col), index: to.index } : null,
  }) as DropResult

function setup() {
  const onReorder = vi.fn().mockResolvedValue(undefined)
  const { result } = renderHook(() =>
    useDragTask({ tasksByStatus: map(), onReorder }),
  )
  return { onReorder, handleDragEnd: result.current.handleDragEnd }
}

describe('useDragTask (T-202)', () => {
  it('брошенная мимо колонки карточка ничего не сохраняет', async () => {
    const { onReorder, handleDragEnd } = setup()

    await handleDragEnd(drop({ col: 1, index: 0 }))

    expect(onReorder).not.toHaveBeenCalled()
  })

  it('возврат карточки на своё же место не шлёт запрос', async () => {
    // Без этой границы каждое случайное касание карточки писало бы на сервер.
    const { onReorder, handleDragEnd } = setup()

    await handleDragEnd(drop({ col: 1, index: 0 }, { col: 1, index: 0 }))

    expect(onReorder).not.toHaveBeenCalled()
  })

  it('перенос в другую колонку шлёт целевой статус и новый порядок', async () => {
    const { onReorder, handleDragEnd } = setup()

    await handleDragEnd(drop({ col: 1, index: 0 }, { col: 2, index: 0 }))

    expect(onReorder).toHaveBeenCalledWith({ statusId: 2, taskIds: ['a', 'c'] })
  })

  it('перестановка внутри колонки шлёт ту же колонку и переставленный порядок', async () => {
    const { onReorder, handleDragEnd } = setup()

    await handleDragEnd(drop({ col: 1, index: 0 }, { col: 1, index: 1 }))

    expect(onReorder).toHaveBeenCalledWith({ statusId: 1, taskIds: ['b', 'a'] })
  })
})
