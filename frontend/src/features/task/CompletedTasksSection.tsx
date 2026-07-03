import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Chip, Stack, Typography } from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import { useModal } from '@ebay/nice-modal-react'
import { TaskCardModal } from '@/widget/modal/task'
import { TaskType } from '@/entities/task/ui/TaskType'
import { TaskCode } from '@/entities/task/ui/styles'
import { mapTaskMinDTOToTaskCard } from '@/entities/task/mapDTO'
import { workTechApi } from '@/shared/api/endpoint'
import { LISTS_POLL_INTERVAL_MS } from '@/features/task/query/pollingConfig'
import { formatDateDDMMYYYY } from '@/shared/utils/date'
import { truncateText } from '@/shared/utils/text'
import type { ITaskCard } from '@/entities/task/types'
import type { TaskFilter } from '@/features/task/hook/useTaskFilter/useTaskFilter.type'

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
      <Stack
        direction="row"
        alignItems="center"
        gap={1}
        onClick={() => setIsExpanded((prev) => !prev)}
        sx={{ cursor: 'pointer', userSelect: 'none' }}
      >
        {isExpanded ? (
          <ExpandMoreIcon fontSize="small" sx={{ color: 'text.secondary' }} />
        ) : (
          <ChevronRightIcon fontSize="small" sx={{ color: 'text.secondary' }} />
        )}
        <CheckCircleOutlineIcon fontSize="small" sx={{ color: 'success.main' }} />
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
          Завершённые
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {visibleTasks.length} задач
        </Typography>
      </Stack>

      {isExpanded && visibleTasks.length === 0 && (
        <Typography variant="caption" color="text.disabled" sx={{ pl: 4 }}>
          Завершённых задач пока нет.
        </Typography>
      )}

      {isExpanded && visibleTasks.length > 0 && (
        <Stack gap={0.5} component="ul" sx={{ m: 0, p: 0, listStyle: 'none' }}>
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
                backgroundColor: 'rgba(246, 246, 246, .6)',
                '&:hover': { backgroundColor: 'rgba(246, 246, 246, .95)' },
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
