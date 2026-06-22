import type { TaskPriority } from './types'

export const PRIORITY_COLORS: Record<TaskPriority, string> = {
  LOW: '#E1FAE1',
  MEDIUM: '#FAEFE1',
  HIGH: '#FAE1E1',
} as const

export const PRIORITY_COLORS_BORDERS: Record<TaskPriority, string> = {
  LOW: '#CBF6CB',
  MEDIUM: '#F7E4CA',
  HIGH: '#F6D2CB',
} as const

export const ESTIMATION_MAX = 9999

export type TaskFilterId = 'my'

export interface TaskFilterDef {
  label: string
  id: TaskFilterId
  type: 'button'
  value: boolean
}

export const TASK_FILTER: Record<TaskFilterId, TaskFilterDef> = {
  my: {
    label: 'Мои задачи',
    id: 'my',
    type: 'button',
    value: false,
  },
}
