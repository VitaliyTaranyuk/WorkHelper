import { workTechApi } from '@/shared/api/endpoint'
import { useMutation, useQueryClient } from '@tanstack/react-query'

type ArchiveVariables = { projectId: string; taskId: string }

/**
 * Архивация и возврат задачи из архива (T-151).
 *
 * Эндпоинты существовали с 2026-07, но в интерфейсе не было ни одной кнопки —
 * функциональность была недоступна (**K-32**). Архив — обратимое действие,
 * поэтому подтверждения нет (как в Jira/Linear): задача уходит с доски в
 * «Завершённые» с пометкой «В архиве», откуда её можно вернуть.
 *
 * Инвалидация запускается, но не ожидается — тот же приём, что в
 * `useDeleteTask` (ТП-239): ответ сервера уже получен, ждать перерисовку
 * списков незачем.
 */
function invalidateAfterArchive(
  queryClient: ReturnType<typeof useQueryClient>,
  projectId: string,
) {
  void queryClient.invalidateQueries({ queryKey: ['tasks', projectId] })
  // Списки спринтов и бэклога держат свои задачи отдельно.
  void queryClient.invalidateQueries({ queryKey: ['sprints', projectId] })
}

export function useArchiveTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ projectId, taskId }: ArchiveVariables) =>
      workTechApi.task.archiveTask({ projectId, taskId }),
    onSuccess: (_, variables) =>
      invalidateAfterArchive(queryClient, variables.projectId),
  })
}

export function useRestoreTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ projectId, taskId }: ArchiveVariables) =>
      workTechApi.task.restoreTask({ projectId, taskId }),
    onSuccess: (_, variables) =>
      invalidateAfterArchive(queryClient, variables.projectId),
  })
}
