import { memo, useMemo, useState } from 'react'
import { InputAdornment, Stack, Typography } from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import { Loader } from '@/shared/ui/components/Loader'
import { TextField } from '@/shared/ui/mui/TextFileld'
import { Sprint } from '@/widget/Sprint'
import { TaskFilter } from '@/widget/TaskFilter'
import { useTaskFilter } from '@/features/task/hook/useTaskFilter/useTaskFilter'
import { MoveToSprintMenu } from '@/features/sprint/MoveToSprintMenu'
import { useSprintsWithTasksQuery } from '@/features/sprint/query/useSprintsWithTasksQuery'
import { useSortedSprints } from '@/page/sprint/useSortedSprints'
import { CompletedTasksSection } from '@/features/task/CompletedTasksSection'
import { TASK_FILTER } from '@/entities/task/constants'
import type { ITaskCard } from '@/entities/task/types'

type TaskListPageProps = {
  projectId: string
}

/**
 * «Список задач» (ТП-50) — единый раздел со всеми задачами проекта по
 * спринтам (паттерн Jira Backlog view / ClickUp List):
 *   активный спринт → неактивные спринты → Бэклог → «Завершённые» (свёрнуты).
 * Открывается и по ссылке «Список задач», и по ссылке активного спринта —
 * отображение одинаковое. Поиск фильтрует задачи по коду и названию во всех
 * секциях, включая завершённые.
 */
export const TaskListPage = memo(function TaskListPageInner({
  projectId,
}: TaskListPageProps) {
  const { data: sprints, isLoading } = useSprintsWithTasksQuery(projectId)
  const { currentFilters, updateFilters, taskFilter } = useTaskFilter({
    initialFilters: TASK_FILTER,
  })
  const [search, setSearch] = useState('')

  // Порядок секций: активный → плановые (по дате старта) → Бэклог.
  const { sortedSprints } = useSortedSprints(sprints)

  // Общий фильтр: кнопочные фильтры + поиск по коду/названию.
  const combinedFilter = useMemo(() => {
    const query = search.trim().toLowerCase()
    return (task: ITaskCard) => {
      if (!taskFilter(task)) return false
      if (!query) return true
      return (
        task.code.toLowerCase().includes(query) ||
        task.title.toLowerCase().includes(query)
      )
    }
  }, [taskFilter, search])

  if (isLoading) {
    return (
      <Stack alignItems="center" pt={4}>
        <Loader isLoading />
      </Stack>
    )
  }

  return (
    <Stack>
      <Typography variant="h5" sx={{ mb: 2 }}>
        Список задач
      </Typography>

      <Stack
        direction={{ xs: 'column', md: 'row' }}
        gap={1.5}
        alignItems={{ md: 'center' }}
        sx={{ mb: 1 }}
      >
        <TextField
          size="small"
          placeholder="Поиск по коду или названию задачи"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ width: { xs: '100%', md: 360 } }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
        />
        <TaskFilter
          currentFilters={currentFilters}
          onFilterChange={updateFilters}
        />
      </Stack>

      <Stack
        flexDirection="column"
        gap="36px"
        component="ul"
        sx={{ m: 0, p: 0, mt: '12px', listStyle: 'none' }}
      >
        {sortedSprints.map((sprint) => (
          <li key={sprint.id}>
            <Sprint
              sprint={sprint}
              projectId={projectId}
              taskFilter={combinedFilter}
            />
          </li>
        ))}
      </Stack>

      {/* Завершённые — в самом низу, свёрнуты по умолчанию (ТП-33/ТП-50). */}
      <Stack mt={3}>
        <CompletedTasksSection
          projectId={projectId}
          taskFilter={combinedFilter}
        />
      </Stack>
      <MoveToSprintMenu />
    </Stack>
  )
})
