import type { TaskModelDTO } from '@/data-contracts'
import { workTechApi } from '@/shared/api/endpoint'
import { truncateText } from '@/shared/utils/text'
// Императивный router: useCreateTask вызывается и из NiceModal-модалок,
// которые монтируются ВНЕ RouterProvider (урок ТП-39) — useNavigate там упадёт.
import { router } from '@/application/router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

export function useCreateTask() {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: (taskDTO: TaskModelDTO) =>
      workTechApi.task.createTask({
        data: taskDTO,
      }),
    onSuccess: (response, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['tasks', variables.projectId],
      })
      queryClient.invalidateQueries({
        queryKey: ['sprints', variables.projectId],
      })
      // Создателю приходит уведомление о создании задачи (ТП-36) —
      // обновляем колокольчик сразу, не дожидаясь 30-секундного refetch.
      queryClient.invalidateQueries({ queryKey: ['notifications'] })

      // ТП-59: тост с названием и быстрым переходом к созданной задаче
      // (паттерн Jira/Linear). Автоскрытие — стандартное у sonner,
      // ручное закрытие — closeButton у Toaster.
      const created = response.data
      toast.success(`Создана задача ${created.code}`, {
        description: truncateText(created.title, 80),
        action: {
          label: 'Открыть',
          onClick: () =>
            router.navigate({ to: '/task/$code', params: { code: created.code } }),
        },
      })
    },
    // onError намеренно не показывает общий toast — формы создания задачи
    // (CreateTaskModal / CreateTaskDetails) сами ловят ошибку и подсвечивают
    // конкретные поля. Generic-toast скрывал бы реальную причину.
  })

  return mutation
}
