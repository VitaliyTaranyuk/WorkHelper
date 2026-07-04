import { useMemo } from 'react'
import { router } from '@/application/router'
import { useCreateTask } from '@/features/task/mutation/useCreateTask'
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

  return useMemo(() => {
    if (!ctx) return null
    return {
      createTask: async (input) => {
        const dto: TaskModelDTO = {
          projectId: ctx.projectId,
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
        router.navigate(voiceNavPath(target, ctx.projectId))
      },
    }
  }, [ctx, createTask])
}
