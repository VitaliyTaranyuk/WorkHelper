import type { ITaskCard, TaskStatus } from '@/entities/task/types'
import type { StatusTasksMap } from './Board'

export const getTasksByStatus = ({
  projectStatuses,
  tasks,
}: {
  projectStatuses?: TaskStatus[]
  tasks: ITaskCard[]
}): StatusTasksMap => {
  if (!projectStatuses) {
    return new Map()
  }

  const statusMap: StatusTasksMap = new Map()

  projectStatuses.forEach((status) => {
    statusMap.set(status.id, [])
  })

  tasks.forEach((task) => {
    const statusId = task.status!.id

    const statusTasks = statusMap.get(statusId)
    if (statusTasks) {
      statusTasks.push(task)
    }
  })

  // Сохранённый порядок карточек внутри колонки (drag-and-drop).
  statusMap.forEach((statusTasks) => {
    statusTasks.sort((a, b) => a.position - b.position)
  })

  return statusMap
}

export function updateTasksByStatus({
  tasksByStatus,
  taskId,
  newStatusId,
  oldStatusId,
}: {
  tasksByStatus: StatusTasksMap
  taskId: string
  newStatusId: number
  oldStatusId: number
}): StatusTasksMap {
  const task = tasksByStatus
    .get(oldStatusId)
    ?.find((task) => task.id === taskId)

  if (!task) return new Map(tasksByStatus)

  return new Map(
    Array.from(tasksByStatus).map(([statusId, tasks]) => {
      if (statusId === oldStatusId) {
        return [statusId, tasks.filter((task) => task.id !== taskId)]
      }

      if (statusId === newStatusId) {
        return [statusId, [...tasks, task]]
      }

      return [statusId, [...tasks]]
    }),
  )
}
