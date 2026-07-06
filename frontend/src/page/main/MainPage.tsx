import { useModal } from '@ebay/nice-modal-react'
import { Board } from '@/widget/Board'
import { useCallback, useEffect, useState } from 'react'
import { TaskCardModal } from '@/widget/modal/task'
import type { OnReorder } from '@/widget/Board/Board'
import { useActiveSprintTasks } from '@/features/task/query/useActiveSprintTasks'
import { useReorderColumn } from '@/features/task/mutation/useReorderColumn'
import { useProjectData } from '@/features/project/query/useProjectData'

export function MainPage() {
  const { activeProject } = useProjectData()
  const modal = useModal(TaskCardModal)

  const { data: tasks } = useActiveSprintTasks({ projectId: activeProject?.id })
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
