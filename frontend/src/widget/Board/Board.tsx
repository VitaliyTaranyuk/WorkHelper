import { memo, useMemo } from 'react'
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from '@hello-pangea/dnd'
import { useProjectData } from '@/features/project/query/useProjectData'
import { TaskCard } from '@/entities/task'
import type { ITaskCard } from '@/entities/task/types'
import type { NiceModalHandler } from '@ebay/nice-modal-react'
import {
  BoardContainer,
  BoardColumn,
  ColumnHeader,
  ColumnTitle,
  TaskList,
} from './Board.styles'
import { useDragTask } from './useDragTask'
import { getTasksByStatus } from './utils'
import IconButton from '@mui/material/IconButton'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import Chip from '@mui/material/Chip'
import Tooltip from '@mui/material/Tooltip'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import AddIcon from '@mui/icons-material/Add'
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined'
import DragIndicatorIcon from '@mui/icons-material/DragIndicator'
import {
  useCreateStatus,
  useDeleteStatus,
  useUpdateStatuses,
} from '@/features/status/useStatusActions'
import { useBoardEditModeStore } from '@/features/board/boardEditModeStore'
import { useModal } from '@ebay/nice-modal-react'
import { ProjectHistoryModal } from '@/widget/modal/project/ProjectHistoryModal'
import HistoryIcon from '@mui/icons-material/History'
import type { TaskStatus } from '@/entities/task/types'

export type BoardProps = {
  editTaskModal: NiceModalHandler<{ task: ITaskCard }>
  tasks: ITaskCard[]
  onReorder: OnReorder
}

export type StatusTasksMap = Map<number, ITaskCard[]>
export type OnReorder = (params: {
  statusId: number
  taskIds: string[]
}) => Promise<void>

type StatusReq = {
  id: number
  priority: number
  code: string
  description?: string
  viewed: boolean
  defaultTaskStatus: boolean
}

export const Board = memo(BoardInner)

function BoardInner(props: BoardProps) {
  const { activeProject } = useProjectData()

  const tasksByStatus = useMemo(
    () =>
      getTasksByStatus({
        tasks: props.tasks,
        projectStatuses: activeProject?.statuses,
      }),
    [activeProject?.statuses, props.tasks],
  )

  const visibleStatuses = useMemo(() => {
    if (!activeProject?.statuses) {
      return []
    }

    return [...activeProject.statuses]
      .sort((a, b) => a.priority - b.priority)
      .filter((status) => status.viewed)
  }, [activeProject?.statuses])

  const hiddenColumns = useMemo(
    () =>
      (activeProject?.statuses ?? []).filter(
        (s) => !s.viewed && !s.defaultTaskStatus,
      ),
    [activeProject?.statuses],
  )

  const { handleDragEnd } = useDragTask({
    onReorder: props.onReorder,
    tasksByStatus,
  })

  const createStatus = useCreateStatus()
  const deleteStatus = useDeleteStatus()
  const updateStatuses = useUpdateStatuses()
  const editMode = useBoardEditModeStore((state) => state.editMode)
  const historyModal = useModal(ProjectHistoryModal)

  const toReq = (s: TaskStatus, overrides: Partial<StatusReq> = {}): StatusReq => ({
    id: s.id,
    priority: s.priority,
    code: s.code,
    description: s.description,
    viewed: s.viewed,
    defaultTaskStatus: !!s.defaultTaskStatus,
    ...overrides,
  })

  const handleAddColumn = () => {
    if (!activeProject) return
    const name = window.prompt('Название новой колонки')?.trim()
    if (!name) return
    const maxPriority = activeProject.statuses.reduce(
      (max, s) => Math.max(max, s.priority),
      0,
    )
    createStatus.mutate({
      projectId: activeProject.id,
      code: name,
      priority: maxPriority + 1,
    })
  }

  const handleDeleteColumn = (statusId: number, code: string) => {
    if (!activeProject) return
    if (
      window.confirm(
        `Удалить колонку «${code}»? Её задачи перейдут в колонку по умолчанию.`,
      )
    ) {
      deleteStatus.mutate({ projectId: activeProject.id, statusId })
    }
  }

  const handleRenameColumn = (statusId: number, currentCode: string) => {
    if (!activeProject) return
    const next = window.prompt('Новое название колонки', currentCode)?.trim()
    if (!next || next === currentCode) return
    const statuses = activeProject.statuses.map((s) =>
      toReq(s, s.id === statusId ? { code: next } : {}),
    )
    updateStatuses.mutate({ projectId: activeProject.id, statuses })
  }

  const setColumnVisibility = (statusId: number, viewed: boolean) => {
    if (!activeProject) return
    const statuses = activeProject.statuses.map((s) =>
      toReq(s, s.id === statusId ? { viewed } : {}),
    )
    updateStatuses.mutate({ projectId: activeProject.id, statuses })
  }

  const reorderColumns = (fromIdx: number, toIdx: number) => {
    if (!activeProject) return
    const reordered = [...visibleStatuses]
    const [moved] = reordered.splice(fromIdx, 1)
    if (!moved) return
    reordered.splice(toIdx, 0, moved)

    // Видимые колонки получают приоритеты выше всех скрытых, сохраняя новый
    // порядок; скрытые (в т.ч. Backlog) не трогаем.
    const hiddenMax = (activeProject.statuses ?? [])
      .filter((s) => !s.viewed)
      .reduce((max, s) => Math.max(max, s.priority), 0)
    const newPriorityById = new Map(
      reordered.map((s, i) => [s.id, hiddenMax + 1 + i]),
    )
    const statuses = activeProject.statuses.map((s) =>
      toReq(
        s,
        newPriorityById.has(s.id)
          ? { priority: newPriorityById.get(s.id) }
          : {},
      ),
    )
    updateStatuses.mutate({ projectId: activeProject.id, statuses })
  }

  const onDragEndAll = (result: DropResult) => {
    if (!result.destination) return
    if (result.type === 'COLUMN') {
      if (result.source.index === result.destination.index) return
      reorderColumns(result.source.index, result.destination.index)
      return
    }
    handleDragEnd(result)
  }

  if (!activeProject?.statuses) {
    return null
  }

  return (
    <DragDropContext onDragEnd={onDragEndAll}>
      {editMode && hiddenColumns.length > 0 && (
        <Stack
          direction="row"
          gap={1}
          alignItems="center"
          flexWrap="wrap"
          sx={{ mb: 1 }}
        >
          <span style={{ fontSize: 13, color: 'rgba(120,116,134,1)' }}>
            Скрытые колонки:
          </span>
          {hiddenColumns.map((s) => (
            <Chip
              key={s.id}
              label={s.code}
              size="small"
              onClick={() => setColumnVisibility(s.id, true)}
              variant="outlined"
              icon={<AddIcon fontSize="small" />}
            />
          ))}
        </Stack>
      )}

      <Droppable droppableId="board" direction="horizontal" type="COLUMN">
        {(boardProvided) => (
          <BoardContainer
            ref={boardProvided.innerRef}
            {...boardProvided.droppableProps}
          >
            {visibleStatuses.map((status, colIndex) => {
              const statusTasks: ITaskCard[] =
                tasksByStatus.get(status.id) ?? []
              return (
                <Draggable
                  draggableId={`col-${status.id}`}
                  index={colIndex}
                  key={`col-${status.id}`}
                  isDragDisabled={!editMode}
                >
                  {(colDrag) => (
                    <BoardColumn
                      ref={colDrag.innerRef}
                      {...colDrag.draggableProps}
                    >
                      <ColumnHeader
                        {...(editMode ? colDrag.dragHandleProps : {})}
                        style={
                          editMode ? { cursor: 'grab' } : undefined
                        }
                      >
                        <Stack
                          direction="row"
                          alignItems="center"
                          gap={0.5}
                          sx={{ minWidth: 0 }}
                        >
                          {editMode && (
                            <DragIndicatorIcon
                              fontSize="small"
                              sx={{ color: 'text.disabled', flexShrink: 0 }}
                            />
                          )}
                          <ColumnTitle
                            onDoubleClick={() =>
                              editMode &&
                              handleRenameColumn(status.id, status.code)
                            }
                            title={
                              editMode
                                ? 'Двойной клик — переименовать, тащить — переместить'
                                : undefined
                            }
                          >
                            {status.code}
                            {statusTasks.length > 0
                              ? ` (${statusTasks.length})`
                              : ''}
                          </ColumnTitle>
                        </Stack>
                        {editMode && !status.defaultTaskStatus && (
                          <Stack direction="row" sx={{ flexShrink: 0 }}>
                            <Tooltip title="Скрыть колонку">
                              <IconButton
                                size="small"
                                aria-label="Скрыть колонку"
                                onClick={() =>
                                  setColumnVisibility(status.id, false)
                                }
                              >
                                <VisibilityOffOutlinedIcon fontSize="inherit" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Удалить колонку">
                              <IconButton
                                size="small"
                                aria-label="Удалить колонку"
                                onClick={() =>
                                  handleDeleteColumn(status.id, status.code)
                                }
                              >
                                <DeleteOutlineIcon fontSize="inherit" />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        )}
                      </ColumnHeader>
                      <Droppable droppableId={`${status.id}`} type="TASK">
                        {(provided) => (
                          <TaskList
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                          >
                            {statusTasks.map((task, idx) => (
                              <Draggable
                                draggableId={task.id}
                                index={idx}
                                key={task.id}
                              >
                                {(dragProvided) => (
                                  <div
                                    ref={dragProvided.innerRef}
                                    {...dragProvided.draggableProps}
                                    {...dragProvided.dragHandleProps}
                                  >
                                    <TaskCard
                                      {...task}
                                      onTitleClick={() =>
                                        props.editTaskModal.show({ task })
                                      }
                                    />
                                  </div>
                                )}
                              </Draggable>
                            ))}
                            {provided.placeholder}
                          </TaskList>
                        )}
                      </Droppable>
                    </BoardColumn>
                  )}
                </Draggable>
              )
            })}
            {boardProvided.placeholder}
            {editMode && (
              <Stack gap={1} sx={{ flexShrink: 0, pt: '2px' }}>
                <Button
                  onClick={handleAddColumn}
                  startIcon={<AddIcon />}
                  sx={{ minWidth: 180, height: 40, textTransform: 'none' }}
                >
                  Добавить колонку
                </Button>
                <Button
                  onClick={() =>
                    historyModal.show({ projectId: activeProject.id })
                  }
                  startIcon={<HistoryIcon />}
                  sx={{ minWidth: 180, height: 40, textTransform: 'none' }}
                >
                  История изменений
                </Button>
              </Stack>
            )}
          </BoardContainer>
        )}
      </Droppable>
    </DragDropContext>
  )
}
