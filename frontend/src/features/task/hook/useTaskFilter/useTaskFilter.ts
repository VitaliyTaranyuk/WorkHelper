import type {
  ITaskFilterObj,
  IFilterKey,
  ITaskCard,
} from '@/entities/task/types'
import { useAuthStore, userSelector } from '@/features/auth/authStore'
import { useMemo, useState } from 'react'
import type {
  FilterFuncByFilter,
  UpdateButtonFilterParams,
  UpdateDropdownFilterParams,
  UpdateFiltersParams,
} from './useTaskFilter.type'
import { makeFilterAssignees } from './utils'

export function useTaskFilter({
  initialFilters,
}: {
  initialFilters: ITaskFilterObj
}) {
  const [currentFilters, setCurrentFilters] =
    useState<ITaskFilterObj>(initialFilters)
  const user = useAuthStore(userSelector)

  function updateButtonFilter({
    filterId,
  }: UpdateButtonFilterParams['filterValue']) {
    setCurrentFilters((prevFilters) => {
      const prevFilter = prevFilters[filterId]
      return {
        ...prevFilters,
        [filterId]: {
          ...prevFilter,
          value: !prevFilter.value,
        },
      }
    })
  }

  function updateDropdownFilter({
    filterId,
    value,
  }: UpdateDropdownFilterParams['filterValue']) {
    setCurrentFilters((prevFilters) => {
      if (prevFilters[filterId].type !== 'dropdown')
        throw new Error(
          `inappropriate filter ${filterId} for updating dropdown`,
        )

      const prevFilter = prevFilters[filterId]
      const selectedItems = prevFilter.value
      const wasValueTurnedOn = selectedItems.includes(value)
      const newFilterValue = wasValueTurnedOn
        ? selectedItems.filter((id: string) => id !== value)
        : [...selectedItems, value]

      return {
        ...prevFilters,
        [filterId]: { ...prevFilter, value: newFilterValue },
      }
    })
  }

  function updateFilters({ filterType, filterValue }: UpdateFiltersParams) {
    if (filterType === 'button') {
      updateButtonFilter(filterValue)
    } else if (filterType === 'dropdown') {
      updateDropdownFilter(filterValue)
    }
  }

  const filterFuncByFilterId = useMemo(
    (): FilterFuncByFilter => ({
      my: makeFilterAssignees([user!]),
      creator: (task: ITaskCard) =>
        currentFilters.creator.value.includes(task.creator.id),
      assignee: (task: ITaskCard) =>
        currentFilters.assignee.value.includes(task.assignee?.id || ''),
    }),
    [currentFilters.assignee.value, currentFilters.creator.value, user],
  )

  const curActiveFitlersIds = useMemo(() => {
    return (Object.keys(currentFilters) as IFilterKey[]).filter((key) => {
      const filter = currentFilters[key]
      return filter.type === 'button' ? filter.value : filter.value.length > 0
    })
  }, [currentFilters])

  const taskFilter = (task: ITaskCard) => {
    if (curActiveFitlersIds.length === 0) return true

    return curActiveFitlersIds.some((filterId) =>
      filterFuncByFilterId[filterId](task),
    )
  }

  return { currentFilters, updateFilters, taskFilter }
}
