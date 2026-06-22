import type { UpdateTaskModelDTO } from '@/data-contracts'
import { workTechApi } from '@/shared/api/endpoint'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

export function useEditTask() {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: ({
      projectId,
      taskId,
      data,
    }: {
      projectId: string
      taskId: string
      data: UpdateTaskModelDTO
    }) =>
      workTechApi.task.updateTask({
        projectId: projectId,
        taskId: taskId,
        data,
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['tasks', variables.projectId],
      })
      queryClient.invalidateQueries({
        queryKey: ['sprints', variables.projectId],
      })
      toast.success('Задача обновлена')
    },
    onError: () => {
      toast.error('Не удалось сохранить изменения')
    },
  })

  return mutation
}
