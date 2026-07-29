import type { TaskModelDTO } from '@/data-contracts'
import { workTechApi } from '@/shared/api/endpoint'
import { truncateText } from '@/shared/utils/text'
import NiceModal from '@ebay/nice-modal-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { notify as toast } from '@/shared/ui/notify'
import { upgradeAutoTitle } from '@/features/task/upgradeAutoTitle'
import { upgradeDictatedDescription } from '@/features/task/upgradeDictatedDescription'

/**
 * ТП-239: помимо DTO мутация принимает признак `autoTitle` — название
 * сформировано движком, а не человеком. Только такое название разрешено
 * переписать фоновым улучшением после создания.
 */
export type CreateTaskVariables = {
  dto: TaskModelDTO
  autoTitle?: boolean
}

export function useCreateTask() {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: ({ dto }: CreateTaskVariables) =>
      workTechApi.task.createTask({
        data: dto,
      }),
    onSuccess: (response, { dto, autoTitle }) => {
      queryClient.invalidateQueries({
        queryKey: ['tasks', dto.projectId],
      })
      queryClient.invalidateQueries({
        queryKey: ['sprints', dto.projectId],
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

      // ТП-239/ТП-240: улучшение авто-названия — ПОСЛЕ создания и без ожидания.
      // Форма к этому моменту уже закрыта, задача существует; название доедет
      // через несколько секунд и обновит списки. Промис намеренно не
      // возвращается: onSuccess, вернувший промис, задержал бы mutateAsync —
      // ровно этим и тормозило удаление задачи (см. useDeleteTask).
      const refreshLists = () => {
        queryClient.invalidateQueries({ queryKey: ['tasks', dto.projectId] })
        queryClient.invalidateQueries({ queryKey: ['sprints', dto.projectId] })
      }

      if (autoTitle && dto.description) {
        void upgradeAutoTitle({
          projectId: dto.projectId,
          taskId: created.id,
          description: dto.description,
          createdTitle: created.title,
        }).then((title) => {
          if (title) refreshLists()
        })
      }

      // ТП-241: «Создать» нажали во время диктовки — задача создана с локально
      // отформатированным текстом, вычищенный вариант доезжает следом. Тот же
      // приём, что с названием: форма уже закрыта, ждать её некому.
      void upgradeDictatedDescription({
        projectId: dto.projectId,
        taskId: created.id,
        createdDescription: dto.description,
      }).then((description) => {
        if (description) refreshLists()
      })
    },
    // onError намеренно не показывает общий toast — формы создания задачи
    // (CreateTaskModal / CreateTaskDetails) сами ловят ошибку и подсвечивают
    // конкретные поля. Generic-toast скрывал бы реальную причину.
  })

  return mutation
}
