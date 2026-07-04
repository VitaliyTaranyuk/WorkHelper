import { useMutation, useQueryClient } from '@tanstack/react-query'
import { notify as toast } from '@/shared/ui/notify'
import { workTechApi } from '@/shared/api/endpoint'
import { SPRINT_QUERY_KEY } from '@/features/sprint/query/constants'

/**
 * Перенос задачи в спринт с сохранением позиции (ТП-24, DnD в «Списке задач»).
 * Обновляет кэш списка спринтов оптимистично — карточка не «прыгает» назад
 * на время запроса; при ошибке кэш откатывается.
 */
export function useReorderSprint(projectId: string) {
  const queryClient = useQueryClient()
  const queryKey = ['sprints', projectId, SPRINT_QUERY_KEY.withTasks]

  return useMutation({
    mutationFn: ({
      sprintId,
      taskIds,
    }: {
      sprintId: string
      taskIds: string[]
    }) =>
      workTechApi.task.reorderSprint({
        projectId,
        data: { sprintId, taskIds },
      }),
    onMutate: async ({ sprintId, taskIds }) => {
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData(queryKey)
      queryClient.setQueryData(
        queryKey,
        (
          sprints:
            | Array<{ id: string; tasks: Array<{ id: string }> }>
            | undefined,
        ) => {
          if (!sprints) return sprints
          const allTasks = new Map(
            sprints.flatMap((s) => s.tasks.map((t) => [t.id, t] as const)),
          )
          return sprints.map((s) => {
            if (s.id === sprintId) {
              return {
                ...s,
                tasks: taskIds
                  .map((id) => allTasks.get(id))
                  .filter((t): t is NonNullable<typeof t> => Boolean(t)),
              }
            }
            return {
              ...s,
              tasks: s.tasks.filter((t) => !taskIds.includes(t.id)),
            }
          })
        },
      )
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous)
      toast.error('Не удалось перенести задачу')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['sprints', projectId] })
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] })
    },
  })
}
