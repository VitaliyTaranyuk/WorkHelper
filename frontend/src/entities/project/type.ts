import type { TaskStatus } from '../task/types'
import type { UserWithEmail } from '../user/types'

/** T-519: режим доски. Строка, а не union: незнакомое значение не должно ломать экран (**W-08**). */
export type BoardMode = string

export type ProjectInfo = {
  id: string
  name: string
  code: string
  description?: string
  /** T-519: `SPRINT` (по умолчанию) или `KANBAN`. */
  boardMode: BoardMode
  statuses: TaskStatus[]
  users: UserWithEmail[]
}

export interface ShortProjectInfo {
  id: string
  name: string
}
