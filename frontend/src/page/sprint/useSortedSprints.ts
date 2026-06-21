import type { SprintMinWithTasks } from '@/entities/sprint/type'
import { makeDateObj } from '@/shared/utils/date'
import { useMemo } from 'react'

export function useSortedSprints(loadedSprints?: SprintMinWithTasks[]) {
  const sortedSprints = useMemo<SprintMinWithTasks[]>(() => {
    const sprints = loadedSprints || []

    let defaultSprint: SprintMinWithTasks | null = null
    let activeSprint: SprintMinWithTasks | null = null

    const plannedSprint: SprintMinWithTasks[] = []

    sprints.forEach((sprint) => {
      if (sprint.isActive) {
        activeSprint = sprint
      } else if (sprint.isDefault) {
        defaultSprint = sprint
      } else {
        plannedSprint.push(sprint)
      }
    })

    const sortedPlannedSprints = getSortedByDateSprints(plannedSprint)

    const result: SprintMinWithTasks[] = []

    if (activeSprint) {
      result.push(activeSprint)
    }

    result.push(...sortedPlannedSprints)

    if (defaultSprint) {
      result.push(defaultSprint)
    }

    return result
  }, [loadedSprints])

  return { sortedSprints }
}

function getSortedByDateSprints(sprints: SprintMinWithTasks[]) {
  return sprints.toSorted((a, b) => {
    function hasDateRange(sprint: SprintMinWithTasks) {
      return sprint.startDate && sprint.endDate
    }

    const aHasDateRange = hasDateRange(a)
    const bHasDateRange = hasDateRange(b)

    if (!aHasDateRange && !bHasDateRange) {
      return 0
    }

    if (!aHasDateRange && bHasDateRange) {
      return 1
    }

    if (aHasDateRange && !bHasDateRange) {
      return -1
    }

    const aDateObj = makeDateObj(a.startDate!)
    const bDateObj = makeDateObj(b.startDate!)

    return Number(aDateObj) - Number(bDateObj)
  })
}
