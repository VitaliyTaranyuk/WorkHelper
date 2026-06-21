import { Loader } from '@/shared/ui/components/Loader'
import { memo } from 'react'
import { LoaderWrapper } from './SprintListPage.styles'
import { Stack } from '@mui/material'
import { Sprint } from '@/widget/Sprint'
import { useSortedSprints } from './useSortedSprints'
import { TaskFilter } from '@/widget/TaskFilter'
import { useTaskFilter } from '@/features/task/hook/useTaskFilter/useTaskFilter'
import { MoveToSprintMenu } from '@/features/sprint/MoveToSprintMenu'
import { useSprintsWithTasksQuery } from '@/features/sprint/query/useSprintsWithTasksQuery'
import { TASK_FILTER } from '@/entities/task/constants'

type SprintListPageProps = {
  projectId: string
}

export const SprintListPage = memo(function ({
  projectId,
}: SprintListPageProps) {
  const { data: sprints, isLoading } = useSprintsWithTasksQuery(projectId)
  const { currentFilters, updateFilters, taskFilter } = useTaskFilter({
    initialFilters: TASK_FILTER,
  })

  const { sortedSprints } = useSortedSprints(sprints)

  if (isLoading) {
    return (
      <LoaderWrapper>
        <Loader isLoading />
      </LoaderWrapper>
    )
  }

  return (
    <div>
      <TaskFilter
        currentFilters={currentFilters}
        onFilterChange={updateFilters}
      />

      <Stack
        flexDirection={'column'}
        gap={'36px'}
        component={'ul'}
        marginTop={'12px'}
      >
        {sortedSprints.map((sprint) => (
          <li key={sprint.id}>
            <Sprint
              sprint={sprint}
              projectId={projectId}
              taskFilter={taskFilter}
            />
          </li>
        ))}
      </Stack>
      <MoveToSprintMenu />
    </div>
  )
})
