import type { VoiceContext } from '../command/types'

/**
 * Чистая сборка снимка контекста (ТП-92 / F2). Отделена от React-хука
 * (`useVoiceContext`) ради тестируемости: хук лишь собирает входные данные из
 * существующих хуков/кэшей, вся логика — здесь.
 *
 * Входные формы описаны структурно (минимально), чтобы не связываться с
 * конкретными доменными типами приложения.
 */
export type VoiceContextInputs = {
  user: { id: string } | null | undefined
  project:
    | {
        id: string
        statuses: Array<{ id: number; code: string; description?: string }>
        users: Array<{
          id: string
          firstName: string
          lastName: string
          username?: string
        }>
      }
    | null
    | undefined
  activeSprintId?: string
  sprints: Array<{
    id: string
    name: string | null
    isActive: boolean
    isDefault: boolean
  }>
  openTask?: { id: string; code: string; title: string }
  priorities: ReadonlyArray<{ value: string; label: string }>
}

function fullName(u: { firstName: string; lastName: string }): string {
  return `${u.firstName} ${u.lastName}`.trim()
}

/**
 * Возвращает снимок контекста либо null, если не хватает базовых данных
 * (пользователь, проект, спринт по умолчанию) — без них командам не с чем
 * работать, и «ничего не выдумываем».
 */
export function buildVoiceContext(
  inputs: VoiceContextInputs,
): VoiceContext | null {
  const { user, project, sprints } = inputs
  if (!user || !project) return null

  const defaultSprint = sprints.find((s) => s.isDefault)
  if (!defaultSprint) return null

  return {
    projectId: project.id,
    activeSprintId: inputs.activeSprintId,
    defaultSprintId: defaultSprint.id,
    openTask: inputs.openTask,
    currentUserId: user.id,
    lookup: {
      members: project.users.map((u) => ({
        id: u.id,
        name: fullName(u),
        username: u.username,
      })),
      statuses: project.statuses.map((s) => ({
        id: s.id,
        code: s.code,
        label: s.description?.trim() || s.code,
      })),
      sprints: sprints.map((s) => ({
        id: s.id,
        name: s.name ?? '',
        active: s.isActive,
        isDefault: s.isDefault,
      })),
      priorities: inputs.priorities.map((p) => ({
        value: p.value,
        label: p.label,
      })),
    },
  }
}
