import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from '@hello-pangea/dnd'
import { useProjectData } from '@/features/project/query/useProjectData'
import { TaskCard } from '@/entities/task'
import type { ITaskCard, TaskStatus } from '@/entities/task/types'
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
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined'
import CloseIcon from '@mui/icons-material/Close'
import TuneIcon from '@mui/icons-material/Tune'
import {
  useCreateStatus,
  useDeleteStatus,
  useUpdateStatuses,
} from '@/features/status/useStatusActions'
import { useBoardEditModeStore } from '@/features/board/boardEditModeStore'
import { useModal } from '@ebay/nice-modal-react'
import { ProjectHistoryModal } from '@/widget/modal/project/ProjectHistoryModal'
import HistoryIcon from '@mui/icons-material/History'
import { toast } from 'sonner'

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

  const editMode = useBoardEditModeStore((s) => s.editMode)
  const setDirty = useBoardEditModeStore((s) => s.setDirty)
  const isDirty = useBoardEditModeStore((s) => s.isDirty)
  const setEditMode = useBoardEditModeStore((s) => s.setEditMode)

  /**
   * Локальный черновик конфигурации колонок, активен только в editMode.
   * - draftOrderIds: новый порядок видимых колонок (null = порядок не менялся)
   * - draftVisibility: переопределения viewed (Map<statusId, boolean>); пустая
   *   карта означает «не менялась»
   * Add/rename/delete колонок применяются мгновенно, как раньше — они требуют
   * отдельных запросов и редко комбинируются с reorder.
   */
  const [draftOrderIds, setDraftOrderIds] = useState<number[] | null>(null)
  const [draftVisibility, setDraftVisibility] = useState<Map<number, boolean>>(
    () => new Map(),
  )

  // Синхронизация флага isDirty (для Header)
  useEffect(() => {
    const dirty = draftOrderIds !== null || draftVisibility.size > 0
    setDirty(dirty)
  }, [draftOrderIds, draftVisibility, setDirty])

  // Сброс черновика при выходе из editMode без сохранения
  // (если был dirty — Header показывает confirm, пользователь явно отказался)
  useEffect(() => {
    if (!editMode) {
      setDraftOrderIds(null)
      setDraftVisibility(new Map())
    }
  }, [editMode])

  // Очистка при unmount
  useEffect(() => {
    return () => {
      setDirty(false)
    }
  }, [setDirty])

  // Защита от случайной потери: предупреждение при закрытии вкладки/перезагрузке
  useEffect(() => {
    if (!isDirty) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isDirty])

  const allStatuses = useMemo(
    () => activeProject?.statuses ?? [],
    [activeProject?.statuses],
  )

  /** Эффективный viewed с учётом черновика. */
  const effectiveViewed = useCallback(
    (s: TaskStatus) => draftVisibility.get(s.id) ?? s.viewed,
    [draftVisibility],
  )

  const visibleStatuses = useMemo(() => {
    if (!allStatuses.length) return []
    const visible = allStatuses.filter(effectiveViewed)

    if (editMode && draftOrderIds) {
      const idx = new Map(draftOrderIds.map((id, i) => [id, i]))
      return [...visible].sort((a, b) => {
        const ai = idx.get(a.id)
        const bi = idx.get(b.id)
        if (ai !== undefined && bi !== undefined) return ai - bi
        if (ai !== undefined) return -1
        if (bi !== undefined) return 1
        return a.priority - b.priority
      })
    }
    return [...visible].sort((a, b) => a.priority - b.priority)
  }, [allStatuses, draftOrderIds, editMode, effectiveViewed])

  // ТП-49: скрытого BACKLOG-статуса больше нет — чипы «Скрыты» показывают
  // все невидимые колонки (default-колонка всегда видима).
  const hiddenColumns = useMemo(
    () => allStatuses.filter((s) => !effectiveViewed(s)),
    [allStatuses, effectiveViewed],
  )

  const tasksByStatus = useMemo(
    () =>
      getTasksByStatus({
        tasks: props.tasks,
        projectStatuses: allStatuses,
      }),
    [allStatuses, props.tasks],
  )

  const { handleDragEnd } = useDragTask({
    onReorder: props.onReorder,
    tasksByStatus,
  })

  const createStatus = useCreateStatus()
  const deleteStatus = useDeleteStatus()
  const updateStatuses = useUpdateStatuses()
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
    const maxPriority = allStatuses.reduce(
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
        `Удалить колонку «${code}»? Её задачи перейдут в первую колонку доски.`,
      )
    ) {
      deleteStatus.mutate({ projectId: activeProject.id, statusId })
    }
  }

  const handleRenameColumn = (statusId: number, currentCode: string) => {
    if (!activeProject) return
    const next = window.prompt('Новое название колонки', currentCode)?.trim()
    if (!next || next === currentCode) return
    // Rename применяется мгновенно — не часть черновика конфигурации.
    const statuses = allStatuses.map((s) =>
      toReq(s, s.id === statusId ? { code: next } : {}),
    )
    updateStatuses.mutate({ projectId: activeProject.id, statuses })
  }

  /** Локально пометить колонку как скрытую/видимую в черновике. */
  const toggleVisibilityDraft = (statusId: number, viewed: boolean) => {
    setDraftVisibility((prev) => {
      const next = new Map(prev)
      // Если возвращаем к исходному значению — удаляем переопределение
      const source = allStatuses.find((s) => s.id === statusId)?.viewed
      if (source === viewed) next.delete(statusId)
      else next.set(statusId, viewed)
      return next
    })
  }

  /** Локально переставить колонки в черновике. */
  const reorderColumnsDraft = (fromIdx: number, toIdx: number) => {
    const baseOrder = draftOrderIds ?? visibleStatuses.map((s) => s.id)
    const next = [...baseOrder]
    const [moved] = next.splice(fromIdx, 1)
    if (!moved) return
    next.splice(toIdx, 0, moved)
    setDraftOrderIds(next)
  }

  /** Применить черновик на бэкенд. */
  const handleSaveDraft = async () => {
    if (!activeProject) return
    if (!isDirty) return

    // Финальный порядок: видимые в порядке черновика, скрытые сохраняют свой
    // относительный порядок; видимым назначаем приоритеты выше скрытых, чтобы
    // не создать коллизии с unique-constraint (project, priority).
    const finalOrderedVisible =
      draftOrderIds ?? visibleStatuses.map((s) => s.id)

    const hiddenSorted = [...allStatuses]
      .filter((s) => !(draftVisibility.get(s.id) ?? s.viewed))
      .sort((a, b) => a.priority - b.priority)

    const hiddenPriorityById = new Map(
      hiddenSorted.map((s, i) => [s.id, i + 1]),
    )
    const baseOffset = hiddenSorted.length + 1
    const visiblePriorityById = new Map(
      finalOrderedVisible.map((id, i) => [id, baseOffset + i]),
    )

    const statuses = allStatuses.map((s) => {
      const viewedOverride = draftVisibility.get(s.id) ?? s.viewed
      const priority =
        visiblePriorityById.get(s.id) ?? hiddenPriorityById.get(s.id) ?? s.priority
      return toReq(s, { priority, viewed: viewedOverride })
    })

    try {
      await updateStatuses.mutateAsync({
        projectId: activeProject.id,
        statuses,
      })
      setDraftOrderIds(null)
      setDraftVisibility(new Map())
      toast.success('Изменения колонок сохранены')
    } catch {
      toast.error('Не удалось сохранить изменения колонок')
    }
  }

  const handleCancelDraft = () => {
    if (!isDirty) return
    if (
      !window.confirm(
        'Отменить несохранённые изменения порядка и видимости колонок?',
      )
    ) {
      return
    }
    setDraftOrderIds(null)
    setDraftVisibility(new Map())
  }

  const handleRestoreColumn = (statusId: number) => {
    toggleVisibilityDraft(statusId, true)
  }

  const onDragEndAll = (result: DropResult) => {
    if (!result.destination) return
    if (result.type === 'COLUMN') {
      if (result.source.index === result.destination.index) return
      reorderColumnsDraft(result.source.index, result.destination.index)
      return
    }
    handleDragEnd(result)
  }

  if (!activeProject?.statuses) return null

  return (
    <DragDropContext onDragEnd={onDragEndAll}>
      {/* ТП-60: вход в настройку доски — на самой доске (паттерн Jira/Trello:
          board settings живут на доске, а не в глобальной шапке). */}
      {!editMode && (
        <Stack direction="row" justifyContent="flex-end" sx={{ mb: 0.5 }}>
          <Button
            size="small"
            variant="text"
            color="inherit"
            startIcon={<TuneIcon fontSize="small" />}
            onClick={() => setEditMode(true)}
            sx={{ textTransform: 'none', color: 'text.secondary' }}
          >
            Настроить доску
          </Button>
        </Stack>
      )}
      {editMode && (
        <Stack
          direction="row"
          gap={1}
          alignItems="center"
          flexWrap="wrap"
          sx={{
            mb: 1,
            p: 1,
            borderRadius: '12px',
            backgroundColor: isDirty
              ? 'rgba(255, 235, 175, .85)'
              : 'rgba(246, 246, 246, .85)',
            border: isDirty
              ? '1px solid rgba(237, 108, 2, .35)'
              : '1px solid transparent',
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 500 }}>
            {isDirty
              ? 'Есть несохранённые изменения колонок'
              : 'Режим редактирования доски'}
          </span>
          <div style={{ flex: 1 }} />
          {hiddenColumns.length > 0 && (
            <Stack direction="row" gap={0.5} alignItems="center" flexWrap="wrap">
              <span style={{ fontSize: 12, color: 'rgba(120,116,134,1)' }}>
                Скрыты:
              </span>
              {hiddenColumns.map((s) => (
                <Chip
                  key={s.id}
                  label={s.code}
                  size="small"
                  onClick={() => handleRestoreColumn(s.id)}
                  variant="outlined"
                  icon={<AddIcon fontSize="small" />}
                />
              ))}
            </Stack>
          )}
          <Stack direction="row" gap={1}>
            <Button
              size="small"
              variant="outlined"
              color="inherit"
              startIcon={<CloseIcon />}
              onClick={handleCancelDraft}
              disabled={!isDirty || updateStatuses.isPending}
              sx={{ textTransform: 'none' }}
            >
              Отменить
            </Button>
            <Button
              size="small"
              variant="contained"
              color="primary"
              startIcon={<SaveOutlinedIcon />}
              onClick={handleSaveDraft}
              disabled={!isDirty || updateStatuses.isPending}
              sx={{ textTransform: 'none' }}
            >
              Сохранить
            </Button>
            <Button
              size="small"
              variant="text"
              color="inherit"
              onClick={() => {
                if (isDirty) {
                  if (
                    !window.confirm(
                      'Несохранённые изменения колонок будут потеряны. Закрыть режим редактирования?',
                    )
                  )
                    return
                }
                setEditMode(false)
              }}
              sx={{ textTransform: 'none' }}
            >
              Закрыть
            </Button>
          </Stack>
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
                  // Дефолтные (системные) колонки закреплены по порядку флоу —
                  // перетаскивать нельзя, только переименовывать (ТП-32).
                  isDragDisabled={!editMode || !!status.systemStatus}
                >
                  {(colDrag) => (
                    <BoardColumn
                      ref={colDrag.innerRef}
                      {...colDrag.draggableProps}
                    >
                      <ColumnHeader
                        {...(editMode ? colDrag.dragHandleProps : {})}
                        style={
                          editMode && !status.systemStatus
                            ? { cursor: 'grab' }
                            : undefined
                        }
                      >
                        <Stack
                          direction="row"
                          alignItems="center"
                          gap={0.5}
                          sx={{ minWidth: 0 }}
                        >
                          {editMode &&
                            (status.systemStatus ? (
                              <Tooltip title="Дефолтная колонка: закреплена по порядку флоу, можно только переименовать">
                                <LockOutlinedIcon
                                  fontSize="small"
                                  sx={{ color: 'text.disabled', flexShrink: 0 }}
                                />
                              </Tooltip>
                            ) : (
                              <DragIndicatorIcon
                                fontSize="small"
                                sx={{ color: 'text.disabled', flexShrink: 0 }}
                              />
                            ))}
                          <ColumnTitle
                            onDoubleClick={() =>
                              editMode &&
                              handleRenameColumn(status.id, status.code)
                            }
                            title={
                              editMode
                                ? status.systemStatus
                                  ? 'Двойной клик — переименовать (колонка закреплена)'
                                  : 'Двойной клик — переименовать, тащить — переместить'
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
                                  toggleVisibilityDraft(status.id, false)
                                }
                              >
                                <VisibilityOffOutlinedIcon fontSize="inherit" />
                              </IconButton>
                            </Tooltip>
                            {/* Дефолтные колонки удалить нельзя (ТП-32) */}
                            {!status.systemStatus && (
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
                            )}
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
