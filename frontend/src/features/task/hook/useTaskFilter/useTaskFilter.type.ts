import type { IFilterKey, ITaskCard } from '@/entities/task/types'

export type UpdateButtonFilterParams = {
  filterType: 'button'
  filterValue: { filterId: IFilterKey }
}

export type UpdateFiltersParams = UpdateButtonFilterParams

export type TaskFilter = (task: ITaskCard) => boolean
export type FilterFuncByFilter = Record<IFilterKey, TaskFilter>
