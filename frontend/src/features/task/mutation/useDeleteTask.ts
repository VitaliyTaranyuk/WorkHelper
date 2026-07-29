import { workTechApi } from '@/shared/api/endpoint'
import { useMutation, useQueryClient } from '@tanstack/react-query'

export function useDeleteTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      projectId,
      taskId,
    }: {
      projectId: string
      taskId: string
    }) => workTechApi.task.deleteTask({ projectId, taskId }),
    // ТП-239: инвалидация запускается, но НЕ ожидается. Раньше onSuccess
    // возвращал промис invalidateQueries, а react-query ждёт возвращённый из
    // onSuccess промис перед тем, как резолвить mutateAsync, — карточка висела
    // до конца рефетча доски. Замер на проде: сам DELETE 2.5 с, рефетч ещё
    // 6.5 с, карточка закрывалась через 9 с. Ответ сервера уже получен —
    // ждать перерисовку списков незачем.
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ['tasks', variables.projectId],
      })
      // Списки спринтов и бэклога держат свои задачи (`sprints`), и без этой
      // инвалидации удалённая задача жила в них до следующего поллинга.
      void queryClient.invalidateQueries({
        queryKey: ['sprints', variables.projectId],
      })
    },
  })
}
