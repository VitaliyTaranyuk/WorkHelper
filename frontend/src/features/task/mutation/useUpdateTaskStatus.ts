import { SPRINT_QUERY_KEY } from '@/features/sprint/query/constants'
import { workTechApi } from '@/shared/api/endpoint'
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
    onError: () => {
      toast.error('Не удалось изменить статус задачи')
    },
  })

  return mutation
}
