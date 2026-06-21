import type { DropResult } from '@hello-pangea/dnd'
import { useCallback } from 'react'
import type { OnReorder, StatusTasksMap } from './Board'

type UseDragTaskProps = {
  tasksByStatus: StatusTasksMap
  onReorder: OnReorder
}

export function useDragTask({ tasksByStatus, onReorder }: UseDragTaskProps) {
  const handleDragEnd = useCallback(
    async (result: DropResult) => {
      if (!result.destination) return

      const sourceStatusId = Number(result.source.droppableId)
      const destStatusId = Number(result.destination.droppableId)

      const sameColumn = sourceStatusId === destStatusId
      if (sameColumn && result.source.index === result.destination.index) return

      const sourceTasks = [...(tasksByStatus.get(sourceStatusId) || [])]
      const [moved] = sourceTasks.splice(result.source.index, 1)
      if (!moved) return

      const destTasks = sameColumn
        ? sourceTasks
        : [...(tasksByStatus.get(destStatusId) || [])]
      destTasks.splice(result.destination.index, 0, moved)

      // Reorder персистит и колонку (статус), и позицию карточки.
      await onReorder({
        statusId: destStatusId,
        taskIds: destTasks.map((task) => task.id),
      })
    },
    [tasksByStatus, onReorder],
  )

  return { handleDragEnd }
}
