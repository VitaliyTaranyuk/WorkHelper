import type { SprintMin } from './type'

/**
 * Досковый спринт — тот, чьи задачи показывает Kanban-доска: активный спринт,
 * а если активного нет — Backlog (kanban-режим без спринтов). Статус доски
 * (колонка) имеет смысл только для задач доскового спринта (ТП-74): у задач
 * бэклога/неактивного спринта колонок доски нет, поэтому поле «Статус» для них
 * не показывается, а бэкенд игнорирует/отклоняет выбор статуса.
 */
export function isBoardSprintId(
  sprints: Pick<SprintMin, 'id' | 'isActive' | 'isDefault'>[],
  sprintId: string | undefined,
): boolean {
  if (!sprintId) return false
  const hasActive = sprints.some((s) => s.isActive)
  return sprints.some(
    (s) => s.id === sprintId && (s.isActive || (!hasActive && s.isDefault)),
  )
}
