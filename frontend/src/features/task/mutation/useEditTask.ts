import type { UpdateTaskModelDTO } from '@/data-contracts'
import { workTechApi } from '@/shared/api/endpoint'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { notify as toast } from '@/shared/ui/notify'

export function useEditTask() {
  const queryClient = useQueryClient()

  // ВАЖНО: onError намеренно НЕ показывает обобщённый toast
  // «Не удалось сохранить». Карточка задачи (TaskCardContent) сама ловит
  // ошибку, парсит field-errors backend и подсвечивает конкретные поля по
  // образцу Jira/Linear/ClickUp.
  return useMutation({
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
  })
}
