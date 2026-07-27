import type { UserWithAvatar, UserWithEmail } from '@/entities/user/types'

/**
 * Приоритеты и типы задач — ПОЛНЫЙ набор значений бэкенда
 * (`models/enums/Priority.java`, `models/enums/TaskType.java`). Источник
 * истины — бэкенд: он принимает и отдаёт эти значения, поэтому фронт обязан
 * их отображать. Неполный набор уже приводил к инциденту 2026-07-28 (задача
 * с типом RESEARCH обнуляла «Список задач», см. `.ai/POSTMORTEM_TEMPLATE.md`).
 * Порядок в кортежах — порядок отображения в UI.
 */
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'BLOCKER'

export type TaskType = 'TASK' | 'BUG' | 'RESEARCH' | 'STORY'

export const TASK_PRIORITY_TUPPLE = ['LOW', 'MEDIUM', 'HIGH', 'BLOCKER'] as const

export const TASK_TYPE_TUPPLE = ['TASK', 'BUG', 'RESEARCH', 'STORY'] as const

export type ITaskCard = {
  id: string
  code: string
  title: string
  description?: string
  priority: TaskPriority
  taskType: TaskType
  estimation?: number
  assignee?: UserWithAvatar
  creator: UserWithAvatar
  createdAt: string
  updatedAt?: string
  sprintId: string
  status: TaskStatusShort
  position: number
  /** Задача в архиве — спринт завершён (ТП-33, раздел «Завершённые»). */
  archived?: boolean
  /** Дата завершения (проставляется при архивации/завершении). */
  completedDate?: string
  /** Последний комментарий — вопрос, ждёт ответа (ТП-45, точка на карточке). */
  awaitingReply?: boolean
}

export type TaskStatus = {
  id: number
  priority: number
  code: string
  description?: string
  viewed: boolean
  projectId: string
  defaultTaskStatus?: boolean
  /** Системная (дефолтная) колонка: закреплена по порядку, удалять нельзя (ТП-32). */
  systemStatus?: boolean
}

export type TaskDataFull = {
  id: string
  title: string

  description?: string
  priority: TaskPriority
  assignee?: UserWithEmail
  creator: UserWithEmail
  createdAt: string
  projectId: string
  sprintId: string

  taskType: TaskType
  status: TaskStatusShort

  estimation?: number
  code: string
}

export type TaskStatusShort = {
  id: number
  code: string
  description?: string
}

/**
 * Предикат фильтрации карточек (ТП-160): применяется поиском в «Списке задач»
 * (Sprint/CompletedTasksSection). Жил в useTaskFilter, который удалён вместе
 * с фильтром «Мои задачи» — тип общий, а не деталь удалённого хука.
 */
export type TaskFilter = (task: ITaskCard) => boolean
