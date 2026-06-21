import type { ITaskCard } from '@/entities/task/types'
import type { User } from '@/entities/user/types'

export function makeFilterAssignees(assignees: User[]) {
  return (task: ITaskCard) =>
    assignees.some((assignee) => isSameAssignee(assignee, task))
}

export function isSameAssignee(user: User, task: ITaskCard) {
  return task.assignee?.id === user.id
}
