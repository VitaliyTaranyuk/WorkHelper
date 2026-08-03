import { useMutation, useQueryClient } from '@tanstack/react-query'
import { SPRINT_QUERY_KEY } from '@/features/sprint/query/constants'
import { workTechApi } from '@/shared/api/endpoint'
import type { BulkTaskRequest } from '@/shared/api/endpoint/tasksApi'
import { notify as toast } from '@/shared/ui/notify'

/**
 * Массовые операции над задачами (T-309), выведенные в интерфейс.
 *
 * <p>Подключены только обратимые: архивация (снимается «Вернуть из архива»,
 * T-157), перенос в спринт и смена статуса. `/bulk/delete` и
 * `/bulk/move-project` намеренно не выводятся — удаление необратимо, а перенос
 * между проектами перевыдаёт код задачи и ломает старые ссылки безвозвратно.
 *
 * <p>Бэкенд атомарен (`findTasksInProject` бросает на первом же чужом или
 * удалённом id, методы транзакционны), поэтому «частичного успеха» не бывает и
 * показывать его нечем. Зато возможен устаревший выбор: список поллится, и
 * задача может исчезнуть между выбором и действием. Такой ответ — не «ошибка
 * сервера», а рассинхрон, и сообщение обязано это объяснять (**K-34**).
 */
function isStaleSelection(error: unknown): boolean {
  const status = (error as { response?: { status?: number } })?.response?.status
  return status === 404
}

function useBulkMutation<TVars extends BulkTaskRequest>(
  request: (data: TVars) => Promise<unknown>,
  failureMessage: string,
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (params: TVars) => request(params),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['tasks', variables.projectId],
      })
      queryClient.invalidateQueries({
        queryKey: ['sprints', variables.projectId, SPRINT_QUERY_KEY.withTasks],
      })
    },
    onError: (error) => {
      // Молчать нельзя (BUG-014 — класс дефектов этого проекта), но и «Не
      // найдена задача с ИД …» пользователю бесполезно.
      toast.error(
        isStaleSelection(error)
          ? 'Часть выбранных задач уже изменилась — список обновлён, выберите заново'
          : failureMessage,
      )
      if (isStaleSelection(error)) {
        queryClient.invalidateQueries({
          queryKey: ['sprints'],
        })
      }
    },
  })
}

export function useBulkArchive() {
  return useBulkMutation(
    (data: BulkTaskRequest) =>
      workTechApi.task.bulkArchiveTasks({ data }),
    'Не удалось архивировать задачи',
  )
}

export function useBulkMoveStatus() {
  return useBulkMutation(
    (data: BulkTaskRequest & { statusId: number }) =>
      workTechApi.task.bulkMoveTasksStatus({ data }),
    'Не удалось сменить статус задач',
  )
}

export function useBulkMoveSprint() {
  return useBulkMutation(
    (data: BulkTaskRequest & { targetSprintId: string }) =>
      workTechApi.task.bulkMoveTasksSprint({ data }),
    'Не удалось перенести задачи в спринт',
  )
}
