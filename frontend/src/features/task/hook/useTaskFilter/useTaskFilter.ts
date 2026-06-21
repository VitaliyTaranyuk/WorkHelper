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

  function updateFilters({ filterValue }: UpdateFiltersParams) {
    updateButtonFilter(filterValue)
  }

  const filterFuncByFilterId = useMemo(
    (): FilterFuncByFilter => ({
      my: makeFilterAssignees([user!]),
    }),
    [user],
  )

  const curActiveFitlersIds = useMemo(() => {
    return (Object.keys(currentFilters) as IFilterKey[]).filter(
      (key) => currentFilters[key].value,
    )
  }, [currentFilters])

  const taskFilter = (task: ITaskCard) => {
    if (curActiveFitlersIds.length === 0) return true

    return curActiveFitlersIds.some((filterId) =>
      filterFuncByFilterId[filterId](task),
    )
  }

  return { currentFilters, updateFilters, taskFilter }
}
