import { IconImg } from '@/shared/ui/IconImg'
import iconArrow from '@/shared/assets/icons/arrow-small.svg'
import { useCallback, useMemo, useState } from 'react'
import type { ITaskCard } from '@/entities/task/types'
import type { SprintMinWithTasks } from '@/entities/sprint/type'
import { getFormattedDateRange } from '@/shared/utils/date'
import {
  EditSprintButton,
  FinishSprintButton,
  StartSprintButton,
  ViewSprintButton,
  PauseSprintButton,
  ResumeSprintButton,
} from '@/features/sprint/SprintActionButton'
import {
  SPRINT_STATUS_COLOR,
  SPRINT_STATUS_LABEL,
} from '@/entities/sprint/status'
import { Stack } from '@mui/material'
import IconButton from '@mui/material/IconButton'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import { useDeleteSprint } from '@/features/sprint/mutation/useDeleteSprint'
import { SprintTask } from '@/entities/task/ui/SprintTask'
import { Spacer } from '@/shared/ui/Spacer'
import { truncateText } from '@/shared/utils/text'
import { SPRINT_TITLE_MAX } from '@/entities/sprint/constants'
import {
  ButtonBlock,
  ControlsBlock,
  EstimationSum,
  ExpandBlock,
  ExpandButton,
  SprintBlock,
  SprintContainer,
  SprintDate,
  TaskAmount,
  TaskBlock,
  TaskSumInfo,
  Title,
  TitleBlock,
} from './Sprint.styles'
import type { FinishingSprint } from '../modal/sprint/FinishSprintModal/type'
import { TaskCardModal } from '../modal/task'
import { useModal } from '@ebay/nice-modal-react'

import { useMoveToSprintMenuStore } from '@/features/sprint/MoveToSprintMenu/moveToSprintMenuStore'
import { useSprintsInfoQuery } from '@/features/sprint/query/useSprintsInfoQuery'
import type { SprintTaskProps } from '@/entities/task/ui/SprintTask/SprintTask'
import { useUpdateTasksSprint } from '@/features/task/mutation/useUpdateTasksSprint'
import type { TaskFilter } from '@/features/task/hook/useTaskFilter/useTaskFilter.type'

export type SprintProps = {
  projectId: string
  sprint: SprintMinWithTasks
  taskFilter?: TaskFilter
}

export function Sprint({ sprint, projectId, taskFilter }: SprintProps) {
  const taskCardModal = useModal(TaskCardModal)
  const { data: sprints } = useSprintsInfoQuery({ projectId })
  const [isExpaneded, setIsExpanded] = useState(true)
  const updateTasksSprint = useUpdateTasksSprint()

  const openPopup = useMoveToSprintMenuStore((state) => state.openPopup)
  const deleteSprint = useDeleteSprint()

  const sprintDateRange = useMemo(
    () =>
      (!!sprint.startDate &&
        !!sprint.endDate &&
        getFormattedDateRange({
          start: sprint.startDate,
          end: sprint.endDate,
        })) ||
      '',
    [sprint.endDate, sprint.startDate],
  )

  const sprintTasks = useMemo(() => {
    if (taskFilter) return sprint.tasks.filter(taskFilter)
    return sprint.tasks
  }, [sprint, taskFilter])

  const tasksSumEstimation = useMemo(
    () => getSumEstimation(sprintTasks),
    [sprintTasks],
  )

  const onTaskEditClick = useCallback(
    (task: ITaskCard) => taskCardModal.show({ task }),
    [taskCardModal],
  )
  const onMoveToSprintClick: SprintTaskProps['onMoveToSprintClick'] =
    useCallback(
      function ({ task, anchor }) {
        openPopup({
          taskId: task.id,
          anchor,
          sprints: (sprints || []).filter(
            (sprintItem) => sprintItem.id !== sprint.id,
          ),
          onSelect: async (props) => {
            await updateTasksSprint.mutateAsync({
              projectId,
              sprintId: props.sprintId,
              taskIds: [props.taskId],
            })
          },
        })
      },
      [openPopup, projectId, sprint.id, sprints, updateTasksSprint],
    )
  const onTitleClick = useCallback(
    async (task: ITaskCard) => {
      await taskCardModal.show({
        task: { ...task, sprintId: task.sprintId || sprint.id },
      })
    },
    [taskCardModal, sprint.id],
  )

  return (
    <SprintContainer>
      <SprintBlock>
        <TitleBlock>
          <Title>
            {truncateText(sprint.name, SPRINT_TITLE_MAX)}

            {!!sprint.tasks.length && (
              <ExpandBlock>
                <ExpandButton
                  onClick={() => setIsExpanded((prev) => !prev)}
                  isExpanded={isExpaneded}
                >
                  <IconImg iconUrl={iconArrow} iconAlt="раскрыть/свернуть" />
                </ExpandButton>
              </ExpandBlock>
            )}
          </Title>

          {(sprintDateRange || !sprint.isDefault) && (
            <SprintDate>
              {sprintDateRange}
              {!sprint.isDefault && (
                <span
                  style={{
                    marginLeft: sprintDateRange ? 8 : 0,
                    color: SPRINT_STATUS_COLOR[sprint.status],
                    fontWeight: 600,
                  }}
                >
                  {SPRINT_STATUS_LABEL[sprint.status]}
                </span>
              )}
            </SprintDate>
          )}
        </TitleBlock>
        <Spacer />
        <ControlsBlock>
          <TaskSumInfo isDefault={sprint.isDefault}>
            {<TaskAmount>{sprintTasks.length || 0} задач</TaskAmount>}
            <EstimationSum>{tasksSumEstimation}</EstimationSum>
          </TaskSumInfo>
          {!sprint.isDefault && (
            <ButtonBlock>
              {/* Просмотр доски — для запущенных/приостановленных */}
              {(sprint.status === 'ACTIVE' || sprint.status === 'PAUSED') && (
                <ViewSprintButton />
              )}

              {/* Запуск — только для черновика */}
              {sprint.status === 'DRAFT' && (
                <StartSprintButton modalProps={{ sprint }} />
              )}

              {/* Пауза / Возобновление */}
              {sprint.status === 'ACTIVE' && (
                <PauseSprintButton
                  projectId={projectId}
                  sprintId={sprint.id}
                />
              )}
              {sprint.status === 'PAUSED' && (
                <ResumeSprintButton
                  projectId={projectId}
                  sprintId={sprint.id}
                />
              )}

              {/* Завершение — для запущенных/приостановленных */}
              {(sprint.status === 'ACTIVE' || sprint.status === 'PAUSED') && (
                <FinishSprintButton
                  modalProps={{
                    projectId,
                    sprint: mapToActiveSprint(sprint),
                  }}
                />
              )}

              {/* Редактирование — для всех незавершённых */}
              {sprint.status !== 'COMPLETED' && (
                <EditSprintButton modalProps={{ projectId, sprint }} />
              )}

              {/* Удаление — для черновика и завершённого (не для активного/паузы) */}
              {(sprint.status === 'DRAFT' ||
                sprint.status === 'COMPLETED') && (
                <IconButton
                  size="small"
                  aria-label="Удалить спринт"
                  onClick={() => {
                    if (
                      window.confirm(
                        `Удалить спринт «${sprint.name}»? Его задачи перейдут в Backlog.`,
                      )
                    ) {
                      deleteSprint.mutate({ projectId, sprintId: sprint.id })
                    }
                  }}
                >
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              )}
            </ButtonBlock>
          )}
        </ControlsBlock>
      </SprintBlock>
      <TaskBlock isExpanded={isExpaneded}>
        {sprintTasks.length > 0 ? (
          <Stack flexDirection={'column'} gap={'8px'} component={'ul'}>
            {sprintTasks.map((task) => (
              <li key={task.id}>
                <SprintTask
                  onEditClick={onTaskEditClick}
                  onMoveToSprintClick={onMoveToSprintClick}
                  onTitleClick={onTitleClick}
                  task={task}
                />
              </li>
            ))}
          </Stack>
        ) : (
          <Stack
            alignItems={'center'}
            justifyContent={'center'}
            height={'48px'}
            sx={{ color: 'text.disabled', fontSize: '14px' }}
          >
            {sprint.tasks.length > 0 ? 'Нет задач по фильтру' : 'Нет задач'}
          </Stack>
        )}
      </TaskBlock>
    </SprintContainer>
  )
}

function mapToActiveSprint(sprint: SprintMinWithTasks): FinishingSprint {
  // TODO: хот фикс, чтобы отображались спринты, сделать показ тостов здесь вместо ошибки
  // if (!sprint.startDate)
  //   throw new Error('У активного спринта не задана дата начала')

  return {
    ...sprint,
    startDate: sprint.startDate || '',
  }
}

function getSumEstimation(tasks: ITaskCard[]) {
  return tasks.reduce((acc, task) => acc + (task.estimation || 0), 0)
}
