import type { SprintMinDto } from '@/data-contracts'
import type { SprintMin, SprintMinWithTasks, SprintStatus } from './type'
import { mapTaskMinDTOToTaskCard } from '../task/mapDTO'

function deriveStatus(sprint: SprintMinDto): SprintStatus {
  if (sprint.status) return sprint.status
  // Фоллбэк для старых ответов без поля status.
  if (sprint.paused) return 'PAUSED'
  if (sprint.active) return 'ACTIVE'
  return 'DRAFT'
}

export function mapSprintMinDtoToSprintMinWithTasks(
  sprint: SprintMinDto,
): SprintMinWithTasks {
  return {
    id: sprint.id,
    name: sprint.name,
    startDate: sprint.startDate,
    endDate: sprint.endDate,
    isActive: sprint.active,
    isPaused: !!sprint.paused,
    isDefault: sprint.defaultSprint,
    status: deriveStatus(sprint),
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
    isPaused: !!sprint.paused,
    isDefault: sprint.defaultSprint,
    status: deriveStatus(sprint),
  }
}
