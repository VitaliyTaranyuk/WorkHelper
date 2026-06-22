import { useModal } from '@ebay/nice-modal-react'
import { Board } from '@/widget/Board'
import { useTaskFilter } from '@/features/task/hook/useTaskFilter/useTaskFilter'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { TaskFilter } from '@/widget/TaskFilter'
import { EditTaskModal } from '@/widget/modal/task'
import type { OnReorder } from '@/widget/Board/Board'
import { useActiveSprintTasks } from '@/features/task/query/useActiveSprintTasks'
import { useReorderColumn } from '@/features/task/mutation/useReorderColumn'
import { useProjectData } from '@/features/project/query/useProjectData'
import { TASK_FILTER } from '@/entities/task/constants'

export function MainPage() {
  const { activeProject } = useProjectData()
  const modal = useModal(EditTaskModal)
  const { currentFilters, updateFilters, taskFilter } = useTaskFilter({
    initialFilters: TASK_FILTER,
  })

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

  const filteredTasks = useMemo(() => {
    return activeSprintTasks.filter(taskFilter)
  }, [taskFilter, activeSprintTasks])

  return (
    <>
      <TaskFilter
        currentFilters={currentFilters}
        onFilterChange={updateFilters}
      />
      <Board editTaskModal={modal} tasks={filteredTasks} onReorder={onReorder} />
    </>
  )
}
