import type { TaskModelDTO } from '@/data-contracts'
import { workTechApi } from '@/shared/api/endpoint'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

export function useCreateTask() {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: (taskDTO: TaskModelDTO) =>
      workTechApi.task.createTask({
        data: taskDTO,
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['tasks', variables.projectId],
      })
      queryClient.invalidateQueries({
        queryKey: ['sprints', variables.projectId],
      })
      toast.success('Задача создана')
    },
    onError: () => {
      toast.error('Не удалось создать задачу')
    },
  })

  return mutation
}
