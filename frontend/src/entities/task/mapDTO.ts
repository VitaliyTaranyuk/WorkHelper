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
import { captureMonitoredError } from '@/shared/monitoring/init'

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
    updatedAt: taskDTO.updatedAt,
    sprintId: taskDTO.sprintId!,
    status: taskDTO.status!,
    position: (taskDTO as { position?: number }).position ?? 0,
    archived: taskDTO.archived,
    completedDate: taskDTO.completedDate,
    awaitingReply: taskDTO.awaitingReply,
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

/**
 * Незнакомое значение перечисления НЕ роняет выдачу (инцидент 2026-07-28).
 *
 * Раньше эти функции бросали исключение: одна задача с типом `RESEARCH`
 * (валидное значение бэкенда) роняла маппинг всего списка спринтов — запрос
 * уходил в error, «Список задач» показывал только «Завершённые», а доска
 * осталась бы пустой. Класс дефекта: расширение перечисления на бэкенде
 * (аддитивное, обратно совместимое изменение) обнуляло экран на фронте.
 *
 * Теперь неизвестное значение деградирует до безопасного дефолта, а сам факт
 * расхождения контракта уходит в прод-мониторинг (ТП-175) — команда видит
 * дрейф до жалоб пользователей. Каждое значение сообщается один раз за
 * сессию: список из сотни задач не должен давать сотню одинаковых событий.
 */
const TASK_PRIORITY_FALLBACK: TaskPriority = 'MEDIUM'
const TASK_TYPE_FALLBACK: TaskType = 'TASK'

const reportedDrift = new Set<string>()

function reportEnumDrift(field: string, value: string | undefined, fallback: string) {
  const key = `${field}:${value}`
  if (reportedDrift.has(key)) return
  reportedDrift.add(key)
  captureMonitoredError(
    new Error(
      `Неизвестное значение «${field}» от бэкенда: ${value ?? '(пусто)'} — использован фолбэк «${fallback}»`,
    ),
    { area: `контракт API: task.${field}` },
  )
}

function castTaskPriority(priority?: string): TaskPriority {
  if (priority && TASK_PRIORITY_TUPPLE.includes(priority as TaskPriority)) {
    return priority as TaskPriority
  }

  reportEnumDrift('priority', priority, TASK_PRIORITY_FALLBACK)
  return TASK_PRIORITY_FALLBACK
}

function castTaskType(taskType?: string): TaskType {
  if (taskType && TASK_TYPE_TUPPLE.includes(taskType as TaskType)) {
    return taskType as TaskType
  }

  reportEnumDrift('taskType', taskType, TASK_TYPE_FALLBACK)
  return TASK_TYPE_FALLBACK
}
