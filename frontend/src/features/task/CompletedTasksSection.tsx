import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Chip, IconButton, Stack, Typography } from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import { useModal } from '@ebay/nice-modal-react'
import { TaskCardModal } from '@/widget/modal/task'
import { TaskType } from '@/entities/task/ui/TaskType'
import { TaskCode } from '@/entities/task/ui/styles'
import { mapTaskMinDTOToTaskCard } from '@/entities/task/mapDTO'
import { workTechApi } from '@/shared/api/endpoint'
import { LISTS_POLL_INTERVAL_MS } from '@/features/task/query/pollingConfig'
import { formatDateDDMMYYYY } from '@/shared/utils/date'
import { pluralTasks, truncateText } from '@/shared/utils/text'
import type { ITaskCard } from '@/entities/task/types'
import type { TaskFilter } from '@/entities/task/types'

type Props = {
  projectId: string
  taskFilter?: TaskFilter
}

/**
 * Раздел «Завершённые» в списке задач (ТП-33): задачи из завершающей колонки
 * доски текущего спринта и архивные (после закрытия спринтов). В списках
 * спринтов эти задачи не показываются (бэкенд исключает их из sprint-list).
 */
export function CompletedTasksSection({ projectId, taskFilter }: Props) {
  const taskCardModal = useModal(TaskCardModal)
  const [isExpanded, setIsExpanded] = useState(false)

  const { data: completedTasks } = useQuery({
    queryKey: ['tasks', projectId, 'completed'],
    queryFn: () =>
      workTechApi.task
        .getCompletedTasks({ projectId })
        .then((r) => (r.data ?? []).map(mapTaskMinDTOToTaskCard)),
    // ТП-47: раздел подтягивает чужие изменения фоново, как списки спринтов
    refetchInterval: LISTS_POLL_INTERVAL_MS,
    refetchIntervalInBackground: false,
  })

  const visibleTasks = useMemo(() => {
    const tasks = completedTasks ?? []
    return taskFilter ? tasks.filter(taskFilter) : tasks
  }, [completedTasks, taskFilter])

  const openCard = (task: ITaskCard) => taskCardModal.show({ task })

  return (
    <Stack gap={1}>
      {/* Заголовок в стиле секций спринтов (ТП-61): шеврон + заголовок +
          счётчик. Зелёная иконка убрана — статус виден по чипам строк. */}
      <Stack
        direction="row"
        alignItems="center"
        gap={1}
        onClick={() => setIsExpanded((prev) => !prev)}
        // ТП-105: тот же левый отступ заголовка, что у секций спринтов
        // (SprintBlock padding-left: 4px) — иначе «Завершённые» уезжает левее.
        sx={{ cursor: 'pointer', userSelect: 'none', minHeight: 36, pl: '4px' }}
      >
        <IconButton
          size="small"
          aria-label={isExpanded ? 'Свернуть секцию' : 'Развернуть секцию'}
        >
          {isExpanded ? (
            <ExpandMoreIcon fontSize="small" />
          ) : (
            <ChevronRightIcon fontSize="small" />
          )}
        </IconButton>
        <Typography
          component="h2"
          sx={{ fontSize: 16, fontWeight: 600, lineHeight: '24px', m: 0 }}
        >
          Завершённые
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
          {pluralTasks(visibleTasks.length)}
        </Typography>
      </Stack>

      {isExpanded && visibleTasks.length === 0 && (
        <Typography variant="caption" color="text.disabled" sx={{ pl: 4 }}>
          Завершённых задач пока нет.
        </Typography>
      )}

      {isExpanded && visibleTasks.length > 0 && (
        <Stack
          gap={0.5}
          component="ul"
          // ТП-105: тот же отступ строк, что у задач спринта (TaskBlock
          // padding-left: 20px) — выравниваем список с секциями спринтов.
          sx={{ m: 0, p: 0, pl: '20px', listStyle: 'none' }}
        >
          {visibleTasks.map((task) => (
            <Stack
              key={task.id}
              component="li"
              direction="row"
              alignItems="center"
              gap={1}
              sx={{
                p: '6px 10px',
                borderRadius: 1,
                backgroundColor: 'var(--wt-surface-muted)',
                '&:hover': { backgroundColor: 'var(--wt-surface-hover)' },
              }}
            >
              <TaskType taskType={task.taskType} />
              <TaskCode priority={task.priority}>{task.code}</TaskCode>
              <Typography
                variant="body2"
                noWrap
                onClick={() => openCard(task)}
                sx={{
                  cursor: 'pointer',
                  minWidth: 0,
                  '&:hover': { textDecoration: 'underline' },
                }}
                title={task.title}
              >
                {truncateText(task.title, 80)}
              </Typography>
              <Stack direction="row" gap={1} sx={{ ml: 'auto', flexShrink: 0 }}>
                {task.completedDate && (
                  <Typography variant="caption" color="text.secondary">
                    {formatDateDDMMYYYY(task.completedDate)}
                  </Typography>
                )}
                <Chip
                  size="small"
                  variant="outlined"
                  color="success"
                  label={task.archived ? 'В архиве' : 'Готово'}
                  sx={{ height: 20 }}
                />
              </Stack>
            </Stack>
          ))}
        </Stack>
      )}
    </Stack>
  )
}
