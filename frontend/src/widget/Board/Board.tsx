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
                    <ColumnTitle>
                      {status.code}
                      {statusTasks.length > 0 ? ` (${statusTasks.length})` : ''}
                    </ColumnTitle>
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
      </BoardContainer>
    </DragDropContext>
  )
}
