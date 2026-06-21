import type { IFilterKey, ITaskCard } from '@/entities/task/types'

export type UpdateButtonFilterParams = {
  filterType: 'button'
  filterValue: { filterId: IFilterKey }
}

export type UpdateDropdownFilterParams = {
  filterType: 'dropdown'
  filterValue: { filterId: IFilterKey; value: string }
}

export type UpdateFiltersParams =
  | UpdateButtonFilterParams
  | UpdateDropdownFilterParams

export type TaskFilter = (task: ITaskCard) => boolean
export type FilterFuncByFilter = Record<IFilterKey, TaskFilter>
