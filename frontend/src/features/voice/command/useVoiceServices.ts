import { useMemo } from 'react'
import { router } from '@/application/router'
import { useCreateTask } from '@/features/task/mutation/useCreateTask'
import { useUpdateTaskStatus } from '@/features/task/mutation/useUpdateTaskStatus'
import { useUpdateTasksSprint } from '@/features/task/mutation/useUpdateTasksSprint'
import { useEditTask } from '@/features/task/mutation/useEditTask'
import { workTechApi } from '@/shared/api/endpoint'
import { mapTaskMinDTOToTaskCard } from '@/entities/task/mapDTO'
import type { TaskModelDTO } from '@/data-contracts'
import type {
  NavTarget,
  VoiceContext,
  VoiceServices,
} from '../core/command/types'

/**
 * Проводка голосовых команд к СУЩЕСТВУЮЩИМ действиям приложения (ТП-95 / X1):
 * createTask → useCreateTask (та же мутация, что и UI), navigate → router.
 * Инвариант: голос не ходит в API напрямую (ADR-005).
 */

/** Чистое сопоставление NavTarget → маршрут (тестируется отдельно). */
export function voiceNavPath(
  target: NavTarget,
  projectId: string,
):
  | { to: '/main' }
  | { to: '/project/$projectId/backlog'; params: { projectId: string } }
  | { to: '/project/$projectId/calendar'; params: { projectId: string } }
  | { to: '/settings' }
  | { to: '/task/$code'; params: { code: string } } {
  switch (target.kind) {
    case 'board':
      return { to: '/main' }
    case 'tasks':
      return { to: '/project/$projectId/backlog', params: { projectId } }
    case 'calendar':
      return { to: '/project/$projectId/calendar', params: { projectId } }
    case 'settings':
      return { to: '/settings' }
    case 'task':
      return { to: '/task/$code', params: { code: target.code } }
  }
}

export function useVoiceServices(
  ctx: VoiceContext | null,
): VoiceServices | null {
  const createTask = useCreateTask()
  const updateStatus = useUpdateTaskStatus()
  const updateSprint = useUpdateTasksSprint()
  const editTask = useEditTask()

  return useMemo(() => {
    if (!ctx) return null
    const projectId = ctx.projectId
    return {
      createTask: async (input) => {
        const dto: TaskModelDTO = {
          projectId,
          title: input.title,
          taskType: input.taskType,
          priority: input.priority ?? 'MEDIUM',
          ...(input.description ? { description: input.description } : {}),
          ...(input.sprintId ? { sprintId: input.sprintId } : {}),
          ...(input.statusId ? { statusId: input.statusId } : {}),
          ...(input.assignee ? { assignee: input.assignee } : {}),
        }
        const res = await createTask.mutateAsync(dto)
        return { id: res.data.id, code: res.data.code, title: res.data.title }
      },
      navigate: (target) => {
        router.navigate(voiceNavPath(target, projectId))
      },
      setStatus: async (taskId, statusId) => {
        await updateStatus.mutateAsync({ taskId, projectId, statusId })
      },
      setSprint: async (taskId, sprintId) => {
        await updateSprint.mutateAsync({ projectId, sprintId, taskIds: [taskId] })
      },
      findTask: async (code) => {
        try {
          const res = await workTechApi.task.findTaskByCode({ code, projectId })
          const t = mapTaskMinDTOToTaskCard(res.data)
          return { id: t.id, code: t.code, title: t.title }
        } catch {
          return null
        }
      },
      // updateTask требует полный DTO (title/priority обязательны) — читаем
      // текущую задачу и мержим изменение (fetch-merge), не теряя других полей.
      patchTask: async (code, changes) => {
        const res = await workTechApi.task.findTaskByCode({ code, projectId })
        const t = mapTaskMinDTOToTaskCard(res.data)
        await editTask.mutateAsync({
          projectId,
          taskId: t.id,
          data: {
            title: changes.title ?? t.title,
            priority: changes.priority ?? t.priority,
            taskType: t.taskType,
            ...('assignee' in changes
              ? { assignee: changes.assignee }
              : t.assignee
                ? { assignee: t.assignee.id }
                : {}),
            ...(changes.description ?? t.description
              ? { description: changes.description ?? t.description }
              : {}),
            ...(t.sprintId ? { sprintId: t.sprintId } : {}),
          },
        })
        return { id: t.id, code: t.code, title: t.title }
      },
    }
  }, [ctx, createTask, updateStatus, updateSprint, editTask])
}
