import { useModal } from '@ebay/nice-modal-react'
import { Board } from '@/widget/Board'
import { useCallback, useEffect, useState } from 'react'
import { TaskCardModal } from '@/widget/modal/task'
import type { OnReorder } from '@/widget/Board/Board'
import { useActiveSprintTasks } from '@/features/task/query/useActiveSprintTasks'
import { useReorderColumn } from '@/features/task/mutation/useReorderColumn'
import { useProjectData } from '@/features/project/query/useProjectData'
import { useDeclareCurrentProject } from '@/features/project/model/currentProjectStore'
import { useRememberLastProject } from '@/features/project/mutation/useRememberLastProject'
import { LoadErrorState } from '@/shared/ui/components/LoadErrorState'

/**
 * Доска проекта. T-518: проект приходит из адреса (`/project/$projectId/board`)
 * — раньше он брался из серверного `last_project_id`, поэтому доску нельзя
 * было передать ссылкой, а открытая вкладка уезжала на чужой проект, стоило
 * заглянуть в другой. Проп необязателен: `/main` рендерит ту же страницу,
 * пока определяет, куда перенаправить.
 */
export function MainPage({ projectId }: { projectId?: string } = {}) {
  useDeclareCurrentProject(projectId)
  useRememberLastProject(projectId)

  const { activeProject } = useProjectData()
  const modal = useModal(TaskCardModal)

  const {
    data: tasks,
    isError,
    refetch,
  } = useActiveSprintTasks({ projectId: projectId ?? activeProject?.id })
  const reorderMutation = useReorderColumn()

  const [activeSprintTasks, setActiveSprintTasks] = useState(tasks || [])

  useEffect(() => {
    setActiveSprintTasks(tasks || [])
  }, [tasks])

  const onReorder: OnReorder = useCallback(
    async ({ statusId, taskIds }) => {
      const destStatus = activeProject?.statuses.find((s) => s.id === statusId)

      // оптимистично: обновляем колонку и позицию перемещённых карточек
      setActiveSprintTasks((prev) =>
        prev.map((task) => {
          const index = taskIds.indexOf(task.id)
          if (index === -1) return task
          return {
            ...task,
            position: index,
            status: destStatus
              ? {
                  id: destStatus.id,
                  code: destStatus.code,
                  description: destStatus.description,
                }
              : task.status,
          }
        }),
      )

      reorderMutation.mutate({
        projectId: activeProject!.id,
        statusId,
        taskIds,
      })
    },
    [activeProject, reorderMutation],
  )

  // Доска, как и «Список задач», умеет быть пустой — поэтому ошибку загрузки
  // обязана показывать явно, иначе сбой запроса выглядит как «задачи пропали»
  // (инцидент 2026-07-28).
  if (isError) {
    return (
      <LoadErrorState
        title="Не удалось загрузить задачи спринта"
        onRetry={() => void refetch()}
      />
    )
  }

  // ТП-160: фильтр «Мои задачи» удалён — доска показывает все задачи спринта
  // без полосы фильтров (меньше хрома, паттерн Linear); срезы — в «Списке
  // задач» через поиск.
  return (
    <Board
      editTaskModal={modal}
      tasks={activeSprintTasks}
      onReorder={onReorder}
    />
  )
}
