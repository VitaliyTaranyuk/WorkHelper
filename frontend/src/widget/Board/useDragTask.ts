import type { DropResult } from '@hello-pangea/dnd'
import { useCallback } from 'react'
import type { OnTaskStatusChange, StatusTasksMap } from './Board'
import type { TaskStatus } from '@/entities/task/types'

type UseDragTaskProps = {
  projectStatuses: TaskStatus[] | undefined
  tasksByStatus: StatusTasksMap
  onTaskStatusChange: OnTaskStatusChange
}

export function useDragTask({
  projectStatuses,
  tasksByStatus,
  onTaskStatusChange,
}: UseDragTaskProps) {
  const handleDragEnd = useCallback(
    async (result: DropResult) => {
      if (!result.destination || !projectStatuses) return

      const sourceStatusId = Number(result.source.droppableId)
      const destStatusId = Number(result.destination.droppableId)
      const sourceIndex = result.source.index

      const sourceTasks = tasksByStatus.get(sourceStatusId) || []
      const movedTask = sourceTasks[sourceIndex]

      if (!movedTask || sourceStatusId === destStatusId) {
        return
      }

      if (onTaskStatusChange) {
        await onTaskStatusChange({
          taskId: movedTask.id,
          newStatus: projectStatuses.find(
            (status) => status.id === destStatusId,
          )!,
          oldStatus: projectStatuses.find(
            (status) => status.id === sourceStatusId,
          )!,
        })
      }
    },
    [projectStatuses, tasksByStatus, onTaskStatusChange],
  )

  return { handleDragEnd }
}
