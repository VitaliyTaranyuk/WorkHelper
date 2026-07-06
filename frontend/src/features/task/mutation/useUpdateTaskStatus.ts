import { SPRINT_QUERY_KEY } from '@/features/sprint/query/constants'
import { workTechApi } from '@/shared/api/endpoint'
import { extractGeneralError } from '@/shared/api/extractFieldErrors'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { notify as toast } from '@/shared/ui/notify'

export function useUpdateTaskStatus() {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: ({
      taskId,
      projectId,
      statusId,
    }: {
      taskId: string
      projectId: string
      statusId: number
    }) =>
      workTechApi.task.updateTaskStatus({
        data: {
          id: taskId,
          projectId,
          status: statusId,
        },
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['tasks', variables.projectId],
      })
      queryClient.invalidateQueries({
        queryKey: ['sprints', variables.projectId, SPRINT_QUERY_KEY.withTasks],
      })
    },
    onError: (err) => {
      // ТП-143: раньше немой общий текст прятал причину (например, серверный
      // отказ по задаче вне доски или сбой из-за дубликата кода ТП-148) —
      // показываем реальное сообщение бэкенда, как в голосе (ТП-123).
      const reason = extractGeneralError(err)
      toast.error(
        reason
          ? `Не удалось изменить статус: ${reason}`
          : 'Не удалось изменить статус задачи',
      )
    },
  })

  return mutation
}
