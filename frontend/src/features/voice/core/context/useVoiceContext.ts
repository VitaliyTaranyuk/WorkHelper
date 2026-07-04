import { useMemo } from 'react'
import { useParams } from '@tanstack/react-router'
import { useAuthStore, userSelector } from '@/features/auth/authStore'
import { useProjectData } from '@/features/project/query/useProjectData'
import { useActiveSprintQuery } from '@/features/sprint/query/useActiveSprintQuery'
import { useSprintsWithTasksQuery } from '@/features/sprint/query/useSprintsWithTasksQuery'
import { useTaskByCode } from '@/features/task/query/useTaskByCode'
import { TASK_PRIORITY_OPTIONS } from '@/features/task/TaskForm/contants'
import { buildVoiceContext } from './buildVoiceContext'
import type { VoiceContext } from '../command/types'

/**
 * Снимок контекста для командного режима (ТП-92 / F2). Собирается ИЗ УЖЕ
 * СУЩЕСТВУЮЩИХ хуков/кэшей (реюз, без новых запросов и дублирования источников):
 *   - активный проект/статусы/участники — useProjectData;
 *   - активный спринт — useActiveSprintQuery;
 *   - спринты (в т.ч. default/Backlog) — useSprintsWithTasksQuery;
 *   - текущий пользователь — authStore;
 *   - открытая задача — маршрут /task/$code + useTaskByCode (кэш).
 *
 * Вся логика сборки — в чистой `buildVoiceContext` (тестируемо). Возвращает null,
 * пока не готовы базовые данные (проект/пользователь/Backlog-спринт).
 *
 * Ограничение: открытая задача определяется по МАРШРУТУ (/task/$code). Задача,
 * открытая модалкой поверх доски, здесь не видна — это осознанная граница Вехи 1.
 */
export function useVoiceContext(): VoiceContext | null {
  const user = useAuthStore(userSelector)
  const { activeProject } = useProjectData()
  const projectId = activeProject?.id

  const activeSprint = useActiveSprintQuery(projectId)
  const sprints = useSprintsWithTasksQuery(projectId)

  const params = useParams({ strict: false }) as { code?: string }
  const openTaskQuery = useTaskByCode({ projectId, taskCode: params.code })
  const openTaskData = params.code ? openTaskQuery.data : undefined

  return useMemo(
    () =>
      buildVoiceContext({
        user: user ? { id: user.id } : null,
        project: activeProject
          ? {
              id: activeProject.id,
              statuses: activeProject.statuses,
              users: activeProject.users,
            }
          : null,
        activeSprintId: activeSprint.data?.id,
        sprints: (sprints.data ?? []).map((s) => ({
          id: s.id,
          name: s.name,
          isActive: s.isActive,
          isDefault: s.isDefault,
        })),
        openTask: openTaskData
          ? {
              id: openTaskData.id,
              code: openTaskData.code,
              title: openTaskData.title,
            }
          : undefined,
        priorities: TASK_PRIORITY_OPTIONS,
      }),
    [user, activeProject, activeSprint.data?.id, sprints.data, openTaskData],
  )
}
