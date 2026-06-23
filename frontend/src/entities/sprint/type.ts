import type { ITaskCard } from '../task/types'
import type { UserWithEmail } from '../user/types'

export type SprintStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'COMPLETED'

export type SprintMin = Pick<
  SprintFull,
  | 'id'
  | 'name'
  | 'startDate'
  | 'endDate'
  | 'isActive'
  | 'isPaused'
  | 'isDefault'
  | 'status'
>

export type SprintMinWithTasks = SprintMin & { tasks: ITaskCard[] }

export type SprintFull = {
  id: string
  name: string
  goal?: string
  startDate?: string
  endDate?: string
  creator: UserWithEmail
  isActive: boolean
  isPaused: boolean
  isDefault: boolean
  status: SprintStatus
}
