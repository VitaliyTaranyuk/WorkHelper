import { useModal } from '@ebay/nice-modal-react'
import { Board } from '@/widget/Board'
import { useTaskFilter } from '@/features/task/hook/useTaskFilter/useTaskFilter'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { TaskFilter } from '@/widget/TaskFilter'
import { EditTaskModal } from '@/widget/modal/task'
import type { OnTaskStatusChange } from '@/widget/Board/Board'
import { useActiveSprintTasks } from '@/features/task/query/useActiveSprintTasks'
import { useUpdateTaskStatus } from '@/features/task/mutation/useUpdateTaskStatus'
import { useProjectData } from '@/features/project/query/useProjectData'
import { TASK_FILTER } from '@/entities/task/constants'

export function MainPage() {
  const { activeProject } = useProjectData()
  const modal = useModal(EditTaskModal)
  const { currentFilters, updateFilters, taskFilter } = useTaskFilter({
    initialFilters: TASK_FILTER,
  })

  const { data: tasks } = useActiveSprintTasks({ projectId: activeProject?.id })
  const updateTaskStatusMutation = useUpdateTaskStatus()

  const [activeSprintTasks, setActiveSprintTasks] = useState(tasks || [])

  useEffect(() => {
    setActiveSprintTasks(tasks || [])
  }, [tasks])

  const onTaskStatusChange: OnTaskStatusChange = useCallback(
    async ({ taskId, newStatus }) => {
      setActiveSprintTasks((prev) =>
        prev.map((task) => {
          if (task.id === taskId) {
            return {
              ...task,
              status: newStatus,
            }
          }

          return { ...task }
        }),
      )

      updateTaskStatusMutation.mutate({
        taskId,
        projectId: activeProject!.id,
        statusId: newStatus.id,
      })
    },
    [activeProject, updateTaskStatusMutation],
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
      <Board
        editTaskModal={modal}
        tasks={filteredTasks}
        onTaskStatusChange={onTaskStatusChange}
      />
    </>
  )
}
