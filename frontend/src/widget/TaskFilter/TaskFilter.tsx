import styled from '@emotion/styled'
import { TASK_FILTER } from '@/entities/task/constants'
import { DropdownFilter } from './DropdownFilter'
import type { ITaskFilterObj } from '@/entities/task/types'
import { useProjectData } from '@/features/project/query/useProjectData'
import { Loader } from '@/shared/ui/components/Loader'
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
  const projectDataQuery = useProjectData()

  if (projectDataQuery.isLoading) {
    return <Loader isLoading={true} />
  }

  if (!projectDataQuery.activeProject) {
    return null
  }

  const projectUsers = projectDataQuery.activeProject.users

  return (
    <ListContainer>
      {Object.values(TASK_FILTER).map((filter) => (
        <li key={filter.id}>
          {filter.type === 'button' && (
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
          )}

          {filter.type === 'dropdown' && (
            <DropdownFilter
              filter={{ id: filter.id, label: filter.label }}
              avaliableValues={projectUsers.map((user) => ({
                id: user.id,
                label: `${user.firstName} ${user.lastName}`,
              }))}
              selectedValues={currentFilters[filter.id].value}
              onFilterChange={(filterId, userId) =>
                onFilterChange({
                  filterType: 'dropdown',
                  filterValue: { filterId, value: userId },
                })
              }
            />
          )}
        </li>
      ))}
    </ListContainer>
  )
}

const ListContainer = styled.ul`
  display: flex;
  gap: 4px;
`
