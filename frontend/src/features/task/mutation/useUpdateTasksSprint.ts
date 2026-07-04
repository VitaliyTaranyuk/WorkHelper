import type { UpdateTasksSprintRequestDto } from '@/data-contracts'
import { SPRINT_QUERY_KEY } from '@/features/sprint/query/constants'
import { workTechApi } from '@/shared/api/endpoint'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { notify as toast } from '@/shared/ui/notify'

export function useUpdateTasksSprint() {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: (params: UpdateTasksSprintRequestDto) =>
      workTechApi.task.updateTasksSprint({
        data: params,
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['tasks', variables.projectId],
      })
      // ТП-71: без success-тоста — перенос сразу виден в списке/на доске
      queryClient.invalidateQueries({
        queryKey: ['sprints', variables.projectId, SPRINT_QUERY_KEY.withTasks],
      })
    },
    onError: () => {
      toast.error('Не удалось переместить задачи')
    },
  })

  return mutation
}
