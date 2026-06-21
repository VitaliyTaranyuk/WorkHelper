import type { ITaskCard } from '@/entities/task/types'

export type FinishingSprint = {
  id: string
  name: string
  goal?: string
  startDate: string
  endDate?: string

  tasks?: ITaskCard[]
}
