import styled from '@emotion/styled'
import { TASK_FILTER } from '@/entities/task/constants'
import type { ITaskFilterObj } from '@/entities/task/types'
import { SimpleButtonFilter } from './SimpleButtonFilter'
import type { UpdateFiltersParams } from '@/features/task/hook/useTaskFilter/useTaskFilter.type'

type TaskFilterProps = {
  currentFilters: ITaskFilterObj
  onFilterChange: (params: UpdateFiltersParams) => void
}

export function TaskFilter({
  currentFilters,
  onFilterChange,
}: TaskFilterProps) {
  return (
    <ListContainer>
      {Object.values(TASK_FILTER).map((filter) => (
        <li key={filter.id}>
          <SimpleButtonFilter
            filter={{ id: filter.id, label: filter.label }}
            selected={currentFilters[filter.id].value}
            onFilterChange={(filterId) =>
              onFilterChange({
                filterType: 'button',
                filterValue: { filterId },
              })
            }
          />
        </li>
      ))}
    </ListContainer>
  )
}

const ListContainer = styled.ul`
  display: flex;
  gap: 4px;
`
