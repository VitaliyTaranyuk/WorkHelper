import type { SprintMinDto } from '@/data-contracts'
import type { SprintMin, SprintMinWithTasks } from './type'
import { mapTaskMinDTOToTaskCard } from '../task/mapDTO'

export function mapSprintMinDtoToSprintMinWithTasks(
  sprint: SprintMinDto,
): SprintMinWithTasks {
  return {
    id: sprint.id,
    name: sprint.name,
    startDate: sprint.startDate,
    endDate: sprint.endDate,
    isActive: sprint.active,
    isDefault: sprint.defaultSprint,
    tasks: (sprint.tasks || []).map(mapTaskMinDTOToTaskCard),
  }
}

export function mapSprintMinDtoToSprintMin(sprint: SprintMinDto): SprintMin {
  return {
    id: sprint.id,
    name: sprint.name,
    startDate: sprint.startDate,
    endDate: sprint.endDate,
    isActive: sprint.active,
    isDefault: sprint.defaultSprint,
  }
}
