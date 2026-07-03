import type { UserWithAvatar, UserWithEmail } from '@/entities/user/types'
import type { TASK_FILTER } from './constants'
import type { PropertyType } from '@/shared/typeUtils'

export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH'

export type TaskType = 'TASK' | 'BUG'

export const TASK_PRIORITY_TUPPLE = ['LOW', 'MEDIUM', 'HIGH'] as const

export const TASK_TYPE_TUPPLE = ['TASK', 'BUG'] as const

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

export type ITaskFilterObj = typeof TASK_FILTER
export type IFilterKey = keyof ITaskFilterObj
export type FilterType = PropertyType<ITaskFilterObj, IFilterKey>['type']
