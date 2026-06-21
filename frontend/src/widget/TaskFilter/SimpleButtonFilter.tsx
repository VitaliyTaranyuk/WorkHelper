import type { IFilterKey, ITaskFilterObj } from '@/entities/task/types'
import { FilterButton } from './TaskFilter.styles'

export type SimpleFilterId = Extract<
  ITaskFilterObj[keyof ITaskFilterObj],
  { type: 'button' }
>['id']

type SimpleFilterProps = {
  filter: { id: SimpleFilterId; label: string }
  selected: boolean
  onFilterChange: (filterId: IFilterKey) => void
}

export function SimpleButtonFilter({
  filter,
  selected,
  onFilterChange,
}: SimpleFilterProps) {
  return (
    <FilterButton isActive={selected} onClick={() => onFilterChange(filter.id)}>
      {filter.label}
    </FilterButton>
  )
}
