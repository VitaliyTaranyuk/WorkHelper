import { memo, useMemo } from 'react'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import { useProjectData } from '@/features/project/query/useProjectData'
import { TaskCard } from '@/entities/task'
import type { CompactEditFormTask } from '@/features/task/TaskForm/useTaskForm'
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
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import AddIcon from '@mui/icons-material/Add'
import {
  useCreateStatus,
  useDeleteStatus,
  useUpdateStatuses,
} from '@/features/status/useStatusActions'

export type BoardProps = {
  editTaskModal: NiceModalHandler<{ task: CompactEditFormTask }>
  tasks: ITaskCard[]
  onReorder: OnReorder
}

export type StatusTasksMap = Map<number, ITaskCard[]>
export type OnReorder = (params: {
  statusId: number
  taskIds: string[]
}) => Promise<void>

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

  const { handleDragEnd } = useDragTask({
    onReorder: props.onReorder,
    tasksByStatus,
  })

  const createStatus = useCreateStatus()
  const deleteStatus = useDeleteStatus()
  const updateStatuses = useUpdateStatuses()

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
      code: name.toUpperCase(),
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
    if (!next || next.toUpperCase() === currentCode) return
    const statuses = activeProject.statuses.map((s) => ({
      id: s.id,
      priority: s.priority,
      code: s.id === statusId ? next.toUpperCase() : s.code,
      description: s.description,
      viewed: s.viewed,
      defaultTaskStatus: !!s.defaultTaskStatus,
    }))
    updateStatuses.mutate({ projectId: activeProject.id, statuses })
  }

  if (!activeProject?.statuses) {
    return null
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <BoardContainer>
        {visibleStatuses.map((status) => {
          const statusTasks: ITaskCard[] = tasksByStatus.get(status.id) ?? []
          return (
            <Droppable droppableId={`${status.id}`} key={status.id}>
              {(provided) => (
                <BoardColumn
                  key={status.id}
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                >
                  <ColumnHeader>
                    <ColumnTitle
                      onDoubleClick={() =>
                        handleRenameColumn(status.id, status.code)
                      }
                      title="Двойной клик — переименовать"
                    >
                      {status.code}
                      {statusTasks.length > 0 ? ` (${statusTasks.length})` : ''}
                    </ColumnTitle>
                    {!status.defaultTaskStatus && (
                      <IconButton
                        size="small"
                        aria-label="Удалить колонку"
                        onClick={() =>
                          handleDeleteColumn(status.id, status.code)
                        }
                      >
                        <DeleteOutlineIcon fontSize="inherit" />
                      </IconButton>
                    )}
                  </ColumnHeader>
                  <TaskList>
                    {statusTasks.map((task, idx) => {
                      const modalTask: CompactEditFormTask = {
                        ...task,
                        sprintId: task.sprintId || '',
                      }

                      return (
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
                                  props.editTaskModal.show({
                                    task: modalTask,
                                  })
                                }
                              />
                            </div>
                          )}
                        </Draggable>
                      )
                    })}
                    {provided.placeholder}
                  </TaskList>
                </BoardColumn>
              )}
            </Droppable>
          )
        })}
        <Button
          onClick={handleAddColumn}
          startIcon={<AddIcon />}
          sx={{
            alignSelf: 'flex-start',
            minWidth: 160,
            height: 40,
            textTransform: 'none',
            flexShrink: 0,
          }}
        >
          Добавить колонку
        </Button>
      </BoardContainer>
    </DragDropContext>
  )
}
