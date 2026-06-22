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
} from '@/features/sprint/SprintActionButton'
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
import { EditTaskModal } from '../modal/task'
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
  const editTaskModal = useModal(EditTaskModal)
  const { data: sprints } = useSprintsInfoQuery({ projectId })
  const [isExpaneded, setIsExpanded] = useState(true)
  const redirectPath = encodeURIComponent(window.location.pathname)
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
    (task: ITaskCard) =>
      window.open(
        `/task/${task.code}?redirect=${redirectPath}`,
        '_blank',
        'noopener,noreferrer',
      ),
    [redirectPath],
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
      await editTaskModal.show({
        task: { ...task, sprintId: sprint.id },
      })
      // onChangeSprint()
    },
    [editTaskModal, sprint.id],
  )

  return (
    <SprintContainer>
      <SprintBlock>
        <TitleBlock>
          <Title>
            {truncateText(sprint.name, SPRINT_TITLE_MAX)}

            {!!sprintTasks.length && (
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

          {(sprintDateRange || sprint.isActive) && (
            <SprintDate>
              {sprintDateRange} {sprint.isActive && 'Активный'}
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
              {sprint.isActive ? (
                <ViewSprintButton />
              ) : (
                <EditSprintButton
                  modalProps={{
                    projectId,
                    sprint,
                  }}
                />
              )}
              {sprint.isActive ? (
                <FinishSprintButton
                  modalProps={{
                    projectId,
                    sprint: mapToActiveSprint(sprint),
                  }}
                />
              ) : (
                <StartSprintButton
                  modalProps={{
                    sprint,
                  }}
                />
              )}
              {!sprint.isActive && (
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
      {!!sprintTasks.length && (
        <TaskBlock isExpanded={isExpaneded}>
          <Stack flexDirection={'column'} gap={'8px'} component={'ul'}>
            {sprintTasks.map((task) => (
              <li key={task.id}>
                <SprintTask
                  onEditClick={onTaskEditClick}
                  onMoveToSprintClick={onMoveToSprintClick}
                  onTitleClick={onTitleClick}
                  key={task.id}
                  task={task}
                />
              </li>
            ))}
          </Stack>
        </TaskBlock>
      )}
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
