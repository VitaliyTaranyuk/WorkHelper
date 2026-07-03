import { Loader } from '@/shared/ui/components/Loader'
import { memo, useMemo } from 'react'
import { Stack, Typography } from '@mui/material'
import { Sprint } from '@/widget/Sprint'
import { TaskFilter } from '@/widget/TaskFilter'
import { useTaskFilter } from '@/features/task/hook/useTaskFilter/useTaskFilter'
import { MoveToSprintMenu } from '@/features/sprint/MoveToSprintMenu'
import { useSprintsWithTasksQuery } from '@/features/sprint/query/useSprintsWithTasksQuery'
import { TASK_FILTER } from '@/entities/task/constants'
import { CompletedTasksSection } from '@/features/task/CompletedTasksSection'

type BacklogPageProps = {
  projectId: string
}

/**
 * Backlog как самостоятельный раздел.
 *
 * ТП-49: бэклог — это СПРИНТ (defaultSprint), а не статус и не колонка.
 * Здесь показываются все задачи Backlog-спринта независимо от их статуса;
 * на доску они не попадают (доска показывает только задачи активного
 * спринта). Перенос в работу — контекстное меню «Перенести в спринт».
 */
export const BacklogPage = memo(function BacklogPageInner({
  projectId,
}: BacklogPageProps) {
  const { data: sprints, isLoading } = useSprintsWithTasksQuery(projectId)
  const { currentFilters, updateFilters, taskFilter } = useTaskFilter({
    initialFilters: TASK_FILTER,
  })

  const backlogSprint = useMemo(
    () => sprints?.find((s) => s.isDefault),
    [sprints],
  )

  if (isLoading) {
    return (
      <Stack alignItems="center" pt={4}>
        <Loader isLoading />
      </Stack>
    )
  }

  if (!backlogSprint) {
    return (
      <Stack pt={4}>
        <Typography color="text.secondary">
          Backlog для проекта не найден.
        </Typography>
      </Stack>
    )
  }

  return (
    <Stack>
      <Typography variant="h5" sx={{ mb: 2 }}>
        Backlog
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Здесь хранятся все ещё не запланированные задачи. Чтобы взять задачу в
        работу, перенесите её в активный спринт через контекстное меню.
      </Typography>
      <TaskFilter
        currentFilters={currentFilters}
        onFilterChange={updateFilters}
      />
      <Stack mt={2}>
        <Sprint
          sprint={backlogSprint}
          projectId={projectId}
          taskFilter={taskFilter}
        />
      </Stack>

      {/* Завершённые задачи (ТП-33): Done с доски + архив закрытых спринтов —
          отдельным разделом, вне списков спринтов. */}
      <Stack mt={3}>
        <CompletedTasksSection projectId={projectId} taskFilter={taskFilter} />
      </Stack>
      <MoveToSprintMenu />
    </Stack>
  )
})
