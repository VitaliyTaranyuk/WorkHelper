import { Loader } from '@/shared/ui/components/Loader'
import { memo, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Stack, Typography } from '@mui/material'
import { Sprint } from '@/widget/Sprint'
import { TaskFilter } from '@/widget/TaskFilter'
import { useTaskFilter } from '@/features/task/hook/useTaskFilter/useTaskFilter'
import { MoveToSprintMenu } from '@/features/sprint/MoveToSprintMenu'
import { useSprintsWithTasksQuery } from '@/features/sprint/query/useSprintsWithTasksQuery'
import { workTechApi } from '@/shared/api/endpoint'
import { TASK_FILTER } from '@/entities/task/constants'

type BacklogPageProps = {
  projectId: string
}

/**
 * Backlog как самостоятельный раздел.
 *
 * Решение по архитектуре (Jira/Trello-стиль):
 * — backlog хранится в дефолтном спринте проекта (defaultSprint=true).
 * — статус BACKLOG скрыт из основной канбан-доски (viewed=false на бэке),
 *   так что backlog-задачи никогда не появляются среди рабочих колонок.
 * — Здесь отображается только дефолтный спринт с его задачами.
 * — Перенос задачи в активный спринт делается через контекстное меню
 *   "Перенести в спринт" (MoveToSprintMenu).
 */
export const BacklogPage = memo(function BacklogPageInner({
  projectId,
}: BacklogPageProps) {
  const { data: sprints, isLoading } = useSprintsWithTasksQuery(projectId)
  // Статусы берём у проекта из URL: страница Backlog доступна из сайдбара и
  // для неактивного проекта, поэтому «активный» проект здесь не годится.
  const { data: statuses } = useQuery({
    queryKey: ['statuses', projectId],
    queryFn: () =>
      workTechApi.status.getStatuses({ projectId }).then((r) => r.data),
  })
  const { currentFilters, updateFilters, taskFilter } = useTaskFilter({
    initialFilters: TASK_FILTER,
  })

  const backlogSprint = useMemo(() => {
    const sprint = sprints?.find((s) => s.isDefault)
    if (!sprint) return undefined
    // В Backlog показываем только задачи с Backlog-статусом (defaultTaskStatus).
    // Задачи, выведенные на доску сменой статуса (kanban-режим без спринтов),
    // не должны дублироваться и на доске, и в Backlog.
    const defaultStatusId = statuses?.statuses?.find(
      (s) => s.defaultTaskStatus,
    )?.id
    if (defaultStatusId === undefined) return sprint
    return {
      ...sprint,
      tasks: sprint.tasks.filter((task) => task.status.id === defaultStatusId),
    }
  }, [sprints, statuses])

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
      <MoveToSprintMenu />
    </Stack>
  )
})
