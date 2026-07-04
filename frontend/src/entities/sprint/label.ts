import { getFormattedDateRange } from '@/shared/utils/date'

type SprintLike = {
  name?: string | null
  startDate?: string | null
  endDate?: string | null
  isDefault?: boolean
}

/**
 * Единая подпись спринта (ТП-70): название опционально, основной
 * идентификатор — диапазон дат. Используется в меню/селектах/заголовках,
 * где раньше выводилось только имя.
 *
 * «01.07 - 14.07 · Релиз v2» | «01.07 - 14.07» | «Релиз v2» | «Спринт без названия»
 */
export function sprintDisplayLabel(sprint: SprintLike): string {
  if (sprint.isDefault) return 'Бэклог'
  const range =
    sprint.startDate && sprint.endDate
      ? getFormattedDateRange({ start: sprint.startDate, end: sprint.endDate })
      : ''
  const name = (sprint.name ?? '').trim()
  if (range && name) return `${range} · ${name}`
  return range || name || 'Спринт без названия'
}
