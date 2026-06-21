import type {
  TaskDataDto,
  UserShortDataDto,
  UsersTasksInProjectDTO,
} from '@/data-contracts'
import {
  TASK_PRIORITY_TUPPLE,
  TASK_TYPE_TUPPLE,
  type ITaskCard,
  type TaskDataFull,
  type TaskPriority,
  type TaskType,
} from './types'
import { mapUserShortDataDtoToUserWithEmail } from '../user/mapDTO'
import type { UserWithAvatar } from '../user/types'

export function mapTaskMinDTOToTaskCard(taskDTO: TaskDataDto): ITaskCard {
  return {
    ...taskDTO,
    id: taskDTO.id,
    title: taskDTO.title,
    // TODO: исправить когда бекенд поправит типы
    code: taskDTO.code || '',
    priority: castTaskPriority(taskDTO.priority),
    taskType: castTaskType(taskDTO.taskType),
    assignee: taskDTO.assignee
      ? mapUserShortDataDtoToUserWithAvatar(taskDTO.assignee)
      : undefined,
    creator: mapUserShortDataDtoToUserWithAvatar(taskDTO.creator!),
    createdAt: taskDTO.createdAt!,
    sprintId: taskDTO.sprintId!,
    status: taskDTO.status!,
    position: (taskDTO as { position?: number }).position ?? 0,
  }
}

export function mapUsersTasksInProjectDTOToTaskDataFull(
  tasksDTO: UsersTasksInProjectDTO[],
): TaskDataFull[] {
  return tasksDTO.flatMap(
    (taskDTO) =>
      taskDTO.tasks?.map((task) => ({
        ...task,
        assignee:
          task.assignee && mapUserShortDataDtoToUserWithEmail(task.assignee),
        creator: mapUserShortDataDtoToUserWithEmail(task.creator!),
        // TODO: обсудить с беком почему может быть опциональным
        sprintId: task.sprintId || '',
        code: task.code || '',
        priority: castTaskPriority(task.priority),
        taskType: castTaskType(task.taskType),
        createdAt: task.createdAt!,
        status: task.status!,
      })) || [],
  )
}

function mapUserShortDataDtoToUserWithAvatar(
  user: UserShortDataDto,
): UserWithAvatar {
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName || '',
  }
}

function castTaskPriority(priority?: string) {
  if (priority && TASK_PRIORITY_TUPPLE.includes(priority as TaskPriority)) {
    return priority as TaskPriority
  }

  throw new Error('не поддерживаемый тип приоритета')
}

function castTaskType(taskType?: string) {
  if (taskType && TASK_TYPE_TUPPLE.includes(taskType as TaskType)) {
    return taskType as TaskType
  }

  throw new Error('не поддерживаемый тип задачи')
}
