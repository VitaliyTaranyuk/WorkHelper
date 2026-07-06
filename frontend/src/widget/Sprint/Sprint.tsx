import { useCallback, useMemo, useState } from 'react'
import { confirmDialog } from '@/shared/ui/components/ConfirmDialog'
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
import { Chip, Stack } from '@mui/material'
import IconButton from '@mui/material/IconButton'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import { useDeleteSprint } from '@/features/sprint/mutation/useDeleteSprint'
import { SprintTask } from '@/entities/task/ui/SprintTask'
import { Spacer } from '@/shared/ui/Spacer'
import { pluralTasks, truncateText } from '@/shared/utils/text'
import { SPRINT_TITLE_MAX } from '@/entities/sprint/constants'
import { sprintDisplayLabel } from '@/entities/sprint/label'
import {
  ButtonBlock,
  ControlsBlock,
  SecondaryName,
  SectionTitle,
  SprintBlock,
  SprintContainer,
  TaskAmount,
  TaskBlock,
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
import { Droppable, Draggable } from '@hello-pangea/dnd'

export type SprintProps = {
  projectId: string
  sprint: SprintMinWithTasks
  taskFilter?: TaskFilter
  /**
   * Включает drag-and-drop задач (ТП-24): секция становится Droppable с этим
   * id (ожидается id спринта), задачи — Draggable. Требует DragDropContext
   * у родителя (TaskListPage).
   */
  droppableId?: string
}

export function Sprint({ sprint, projectId, taskFilter, droppableId }: SprintProps) {
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

  // ТП-61 (паттерн Jira/Linear): основной текст секции — рабочий период
  // (диапазон дат), а не техническое имя спринта; имя — компактной подписью.
  // Бэклог — постоянная секция с собственным заголовком.
  // ТП-70: имя опционально — фоллбэк для спринта без имени и без дат
  const primaryLabel = sprint.isDefault
    ? 'Бэклог'
    : sprintDateRange ||
      truncateText(sprint.name, SPRINT_TITLE_MAX) ||
      'Спринт без названия'
  const secondaryName =
    !sprint.isDefault && sprintDateRange && sprint.name.trim()
      ? truncateText(sprint.name, SPRINT_TITLE_MAX)
      : ''

  return (
    <SprintContainer>
      <SprintBlock>
        <IconButton
          size="small"
          aria-label={isExpaneded ? 'Свернуть секцию' : 'Развернуть секцию'}
          onClick={() => setIsExpanded((prev) => !prev)}
        >
          {isExpaneded ? (
            <ExpandMoreIcon fontSize="small" />
          ) : (
            <ChevronRightIcon fontSize="small" />
          )}
        </IconButton>
        <TitleBlock onClick={() => setIsExpanded((prev) => !prev)}>
          <SectionTitle>{primaryLabel}</SectionTitle>
          {!sprint.isDefault && (
            <Chip
              size="small"
              label={SPRINT_STATUS_LABEL[sprint.status]}
              sx={{
                height: 20,
                fontSize: 12,
                fontWeight: 600,
                color: '#fff',
                backgroundColor: SPRINT_STATUS_COLOR[sprint.status],
              }}
            />
          )}
          {secondaryName && <SecondaryName>{secondaryName}</SecondaryName>}
        </TitleBlock>
        <Spacer />
        <ControlsBlock>
          <TaskAmount>{pluralTasks(sprintTasks.length)}</TaskAmount>
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
                  onClick={async () => {
                    const ok = await confirmDialog({
                      title: 'Удалить спринт',
                      message: `Удалить спринт «${sprintDisplayLabel(sprint)}»? Его задачи перейдут в Бэклог.`,
                      confirmLabel: 'Удалить',
                      destructive: true,
                    })
                    if (ok) {
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
        {droppableId ? (
          // DnD-режим (ТП-24): Droppable рендерится и при пустом списке,
          // чтобы в пустой спринт/бэклог можно было бросить задачу.
          <Droppable droppableId={droppableId} type="TASK">
            {(provided, snapshot) => (
              <Stack
                ref={provided.innerRef}
                {...provided.droppableProps}
                flexDirection={'column'}
                gap={'8px'}
                component={'ul'}
                sx={{
                  m: 0,
                  p: 0,
                  listStyle: 'none',
                  minHeight: 48,
                  // ТП-86: визуальная индикация целевого спринта при
                  // перетаскивании (в т.ч. между спринтами) — подсветка зоны
                  // сброса, паттерн Jira/Linear backlog.
                  borderRadius: 2,
                  transition: 'background-color 120ms ease, box-shadow 120ms ease',
                  ...(snapshot.isDraggingOver && {
                    backgroundColor: 'var(--wt-accent-soft)',
                    boxShadow: 'inset 0 0 0 2px var(--wt-accent)',
                  }),
                }}
              >
                {sprintTasks.map((task, index) => (
                  <Draggable key={task.id} draggableId={task.id} index={index}>
                    {(drag) => (
                      <li
                        ref={drag.innerRef}
                        {...drag.draggableProps}
                        {...drag.dragHandleProps}
                        style={{
                          listStyle: 'none',
                          ...drag.draggableProps.style,
                        }}
                      >
                        <SprintTask
                          onEditClick={onTaskEditClick}
                          onMoveToSprintClick={onMoveToSprintClick}
                          onTitleClick={onTitleClick}
                          task={task}
                        />
                      </li>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
                {sprintTasks.length === 0 && (
                  <Stack
                    alignItems={'center'}
                    justifyContent={'center'}
                    height={'48px'}
                    sx={{ color: 'text.disabled', fontSize: '14px' }}
                  >
                    {sprint.tasks.length > 0
                      ? 'Нет задач по фильтру'
                      : 'Нет задач — перетащите сюда'}
                  </Stack>
                )}
              </Stack>
            )}
          </Droppable>
        ) : sprintTasks.length > 0 ? (
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

