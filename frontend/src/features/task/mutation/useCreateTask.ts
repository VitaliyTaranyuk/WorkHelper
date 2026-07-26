import type { TaskModelDTO } from '@/data-contracts'
import { workTechApi } from '@/shared/api/endpoint'
import { truncateText } from '@/shared/utils/text'
import NiceModal from '@ebay/nice-modal-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { notify as toast } from '@/shared/ui/notify'

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
          // ТП-195: та же модальная карточка, что и по клику с доски/списка,
          // а не переход на полную страницу /task/$code — задача обязана
          // открываться ОДИНАКОВО из любой точки входа. `NiceModal.show` —
          // глобальная функция (диспатч в сторе провайдера), поэтому работает
          // из мутации вне React-дерева, где хуки роутера недоступны (урок
          // ТП-39). Динамический импорт разрывает цикл
          // useCreateTask → TaskCardModal → … → useCreateTask и не тянет
          // карточку в бандл формы создания.
          onClick: () => {
            void import('@/widget/modal/task/TaskCardModal')
              .then(({ TaskCardModal }) =>
                NiceModal.show(TaskCardModal, { taskCode: created.code }),
              )
              // Закрытие карточки резолвится через modal.reject() — это не
              // ошибка, гасим, чтобы не было unhandled rejection.
              .catch(() => undefined)
          },
        },
      })
    },
    // onError намеренно не показывает общий toast — формы создания задачи
    // (CreateTaskModal / CreateTaskDetails) сами ловят ошибку и подсвечивают
    // конкретные поля. Generic-toast скрывал бы реальную причину.
  })

  return mutation
}
