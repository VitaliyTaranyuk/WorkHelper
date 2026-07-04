import type { SprintDtoRequest } from '@/data-contracts'
import { workTechApi } from '@/shared/api/endpoint'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { notify as toast } from '@/shared/ui/notify'

export function useEditSprint({
  projectId,
  sprintId,
}: {
  projectId: string
  sprintId: string
}) {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: (sprintData: SprintDtoRequest) =>
      workTechApi.sprint.updateSprint({
        data: sprintData,
        projectId,
        sprintId,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['sprints', projectId],
      })
      // ТП-79: правка активного спринта (в т.ч. очистка названия) должна
      // сразу отражаться в сайдбаре — у него отдельный ключ ['activeSprint'],
      // не покрываемый ['sprints']. Как в activate/pause/resume/finish.
      queryClient.invalidateQueries({
        queryKey: ['activeSprint', projectId],
      })
      toast.success('Спринт обновлён')
    },
    onError: () => {
      toast.error('Не удалось обновить спринт')
    },
  })

  return mutation
}
