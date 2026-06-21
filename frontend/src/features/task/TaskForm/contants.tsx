import BugIcon from '@/shared/assets/icons/task-type-bug.svg?react'
import TaskIcon from '@/shared/assets/icons/task-type-task.svg?react'
import { COLOR } from '@/shared/ui/theme/constants'

export const TASK_PRIORITY_OPTIONS = [
  { value: 'LOW', label: 'Низкий' },
  { value: 'MEDIUM', label: 'Средний' },
  { value: 'HIGH', label: 'Высокий' },
] as const

export const TASK_TYPE_OPTIONS = [
  { value: 'TASK', label: <TaskIcon /> },
  { value: 'BUG', label: <BugIcon /> },
] as const

// TODO: использовать в будущем цвета из UI-KIT
export const PRIORITY_COLOR = {
  LOW: 'rgba(203, 246, 203, 1)',
  MEDIUM: 'rgba(247, 228, 202, 1)',
  HIGH: 'rgba(246, 210, 203, 1)',
}

export const ACTIVE_COLOR = COLOR.main[500]
