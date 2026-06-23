import type { SprintStatus } from './type'

export const SPRINT_STATUS_LABEL: Record<SprintStatus, string> = {
  DRAFT: 'Черновик',
  ACTIVE: 'Активный',
  PAUSED: 'Приостановлен',
  COMPLETED: 'Завершён',
}

export const SPRINT_STATUS_COLOR: Record<SprintStatus, string> = {
  DRAFT: '#9E9E9E',
  ACTIVE: '#2E7D32',
  PAUSED: '#ED6C02',
  COMPLETED: '#684FE3',
}
