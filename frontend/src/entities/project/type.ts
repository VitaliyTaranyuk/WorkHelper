import type { TaskStatus } from '../task/types'
import type { UserWithEmail } from '../user/types'

export type ProjectInfo = {
  id: string
  name: string
  code: string
  statuses: TaskStatus[]
  users: UserWithEmail[]
}

export interface ShortProjectInfo {
  id: string
  name: string
}
