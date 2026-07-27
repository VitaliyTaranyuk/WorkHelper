import type { TaskPriority } from './types'

export const PRIORITY_COLORS: Record<TaskPriority, string> = {
  LOW: '#E1FAE1',
  MEDIUM: '#FAEFE1',
  HIGH: '#FAE1E1',
  // BLOCKER насыщеннее HIGH: «блокер» должен отличаться от «высокого»
  // с одного взгляда (паттерн Jira Highest/Blocker).
  BLOCKER: '#F6CBCB',
} as const

export const PRIORITY_COLORS_BORDERS: Record<TaskPriority, string> = {
  LOW: '#CBF6CB',
  MEDIUM: '#F7E4CA',
  HIGH: '#F6D2CB',
  BLOCKER: '#E79E9E',
} as const

/** Подписи приоритетов — единый источник для формы, голоса и подсказок. */
export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  LOW: 'Низкий',
  MEDIUM: 'Средний',
  HIGH: 'Высокий',
  BLOCKER: 'Блокер',
} as const
