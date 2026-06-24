import { useMemo, useState } from 'react'
import {
  Box,
  Button,
  Divider,
  FormControl,
  Stack,
  Tab,
  Tabs,
  Typography,
} from '@mui/material'
import { Controller } from 'react-hook-form'
import { orderBy } from 'lodash'
import { MUIPrimaryButton } from '@/shared/ui/Button'
import { MenuItem, Select } from '@/shared/ui/mui/Select'
import { TextField } from '@/shared/ui/mui/TextFileld'
import { FormCaption } from '@/shared/ui/components/FormCaption'
import { Loader } from '@/shared/ui/components/Loader'
import { useProjectData } from '@/features/project/query/useProjectData'
import { useSprintsInfoQuery } from '@/features/sprint/query/useSprintsInfoQuery'
import { useEditTaskForm, NOT_ASSIGNED_OPTION } from './TaskForm/useTaskForm'
import { transformEstimaionByLimit } from './TaskForm/taskFormSchema'
import { TASK_PRIORITY_OPTIONS } from './TaskForm/contants'
import { useEditTask } from './mutation/useEditTask'
import { useDeleteTask } from './mutation/useDeleteTask'
import { useUpdateTaskStatus } from './mutation/useUpdateTaskStatus'
import { TaskComments } from './TaskComments'
import { TaskHistory } from './TaskHistory'
import { formatUserName, getFullName } from '@/entities/user/utils'
import { ESTIMATION_MAX } from '@/entities/task/constants'
import { formatDateDDMMYYYY } from '@/shared/utils/date'
import type { ITaskCard } from '@/entities/task/types'
import type { User } from '@/entities/user/types'
import { toast } from 'sonner'

type TaskCardContentProps = {
  task: ITaskCard
  /** Вызывается после успешного удаления задачи (закрыть модалку / уйти со страницы). */
  onDeleted?: () => void
}

/**
 * Единое тело карточки задачи (Linear/Jira-стиль): слева — рабочая область
 * (название, описание, активность: комментарии + история), справа — метаданные
 * (статус, исполнитель, приоритет, тип, спринт, оценка, проект, даты, автор).
 *
 * Используется и в модальном окне (TaskCardModal), и на отдельной странице
 * (EditTaskPage, для deep-link из уведомлений). Единственная реализация —
 * никакого «обычная/расширенная» разделения.
 */
export function TaskCardContent({ task, onDeleted }: TaskCardContentProps) {
  const { activeProject, isLoading: isProjectLoading } = useProjectData()
  const { data: sprints, isLoading: isSprintsLoading } = useSprintsInfoQuery({
    projectId: activeProject?.id,
  })
  const form = useEditTaskForm({ task })
  const editTask = useEditTask()
  const deleteTask = useDeleteTask()
  const updateStatus = useUpdateTaskStatus()
  const { errors } = form.formState

  const [activityTab, setActivityTab] = useState(0)
  const [statusId, setStatusId] = useState<number>(task.status.id)

  const projectUsers: User[] = useMemo(
    () => activeProject?.users || [],
    [activeProject?.users],
  )

  const sortedSprints = useMemo(
    () =>
      orderBy(
        (sprints ?? []).filter((s) => s.isActive || s.isDefault),
        ['isActive', 'isDefault', 'name'],
        ['desc', 'desc'],
      ),
    [sprints],
  )

  const projectStatuses = useMemo(
    () =>
      [...(activeProject?.statuses ?? [])].sort(
        (a, b) => a.priority - b.priority,
      ),
    [activeProject?.statuses],
  )

  const onSubmit = form.handleSubmit(async (formValues) => {
    if (!activeProject) return
    try {
      await editTask.mutateAsync({
        projectId: activeProject.id,
        taskId: task.id,
        data: {
          priority: formValues.priority,
          taskType: formValues.type,
          title: formValues.taskTitle,
          sprintId: formValues.sprint,
          ...(formValues.assignee === '-1'
            ? {}
            : { assignee: formValues.assignee }),
          ...(formValues.estimation ? { estimation: formValues.estimation } : {}),
          ...(formValues.description
            ? { description: formValues.description }
            : {}),
        },
      })
      form.reset({ ...formValues })
    } catch {
      toast.error('Не удалось сохранить изменения')
    }
  })

  const onStatusChange = async (nextStatusId: number) => {
    if (!activeProject || nextStatusId === statusId) return
    const prev = statusId
    setStatusId(nextStatusId)
    try {
      await updateStatus.mutateAsync({
        taskId: task.id,
        projectId: activeProject.id,
        statusId: nextStatusId,
      })
    } catch {
      setStatusId(prev) // откат при ошибке
    }
  }

  const onDelete = async () => {
    if (!activeProject) return
    if (!window.confirm(`Удалить задачу ${task.code}?`)) return
    await deleteTask.mutateAsync({ projectId: activeProject.id, taskId: task.id })
    onDeleted?.()
  }

  if (isProjectLoading || isSprintsLoading) {
    return <Loader isLoading />
  }

  return (
    <Stack
      direction={{ xs: 'column', md: 'row' }}
      gap={3}
      alignItems="stretch"
      sx={{ width: '100%' }}
    >
      {/* ЛЕВАЯ КОЛОНКА — рабочая область */}
      <Stack flex={1} minWidth={0} gap={2}>
        <Stack gap={0.5}>
          <FormCaption>Название</FormCaption>
          <TextField
            fullWidth
            size="small"
            {...form.register('taskTitle')}
            error={Boolean(errors.taskTitle)}
            helperText={errors.taskTitle?.message}
            placeholder="Введите заголовок"
          />
        </Stack>

        <Stack gap={0.5}>
          <FormCaption>Описание</FormCaption>
          <TextField
            fullWidth
            multiline
            minRows={8}
            sx={{ '& .MuiInputBase-root': { padding: '12px 11px' } }}
            {...form.register('description')}
            placeholder="Опишите задачу"
          />
        </Stack>

        <Stack gap={1.5} direction="row">
          <MUIPrimaryButton
            disabled={
              !form.formState.isValid ||
              !Object.keys(form.formState.dirtyFields).length
            }
            variant="contained"
            onClick={onSubmit}
          >
            Сохранить
          </MUIPrimaryButton>
          <Button
            variant="outlined"
            color="error"
            onClick={onDelete}
            disabled={deleteTask.isPending}
          >
            Удалить задачу
          </Button>
        </Stack>

        <Divider />

        {/* Активность: комментарии + история */}
        <Box>
          <Tabs
            value={activityTab}
            onChange={(_, v) => setActivityTab(v)}
            sx={{ minHeight: 36, mb: 1 }}
          >
            <Tab label="Комментарии" sx={{ minHeight: 36, py: 0 }} />
            <Tab label="История" sx={{ minHeight: 36, py: 0 }} />
          </Tabs>
          {activityTab === 0 && activeProject && (
            <TaskComments projectId={activeProject.id} taskId={task.id} />
          )}
          {activityTab === 1 && activeProject && (
            <TaskHistory projectId={activeProject.id} taskId={task.id} />
          )}
        </Box>
      </Stack>

      {/* ПРАВАЯ КОЛОНКА — метаданные */}
      <Stack
        width={{ xs: '100%', md: 300 }}
        flexShrink={0}
        gap={2}
        sx={{
          backgroundColor: 'rgba(246, 246, 246, .6)',
          borderRadius: '12px',
          p: 2,
          alignSelf: 'flex-start',
        }}
      >
        <Stack gap={0.5}>
          <FormCaption>Статус</FormCaption>
          <FormControl fullWidth size="small">
            <Select
              value={statusId}
              onChange={(e) => onStatusChange(Number(e.target.value))}
            >
              {projectStatuses.map((s) => (
                <MenuItem key={s.id} value={s.id}>
                  {/* code — единое отображаемое имя колонки, заданное
                      пользователем. Никаких подмен на description / переводов. */}
                  {s.code}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>

        <Stack gap={0.5}>
          <FormCaption>Исполнитель</FormCaption>
          <FormControl fullWidth size="small" error={Boolean(errors.assignee)}>
            <Controller
              control={form.control}
              name="assignee"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onChange={(e) => field.onChange(e.target.value)}
                >
                  <MenuItem value={NOT_ASSIGNED_OPTION.value}>
                    {NOT_ASSIGNED_OPTION.label}
                  </MenuItem>
                  {projectUsers.map((user) => (
                    <MenuItem key={user.id} value={user.id}>
                      {getFullName(user)}
                    </MenuItem>
                  ))}
                </Select>
              )}
            />
          </FormControl>
        </Stack>

        <Stack gap={0.5}>
          <FormCaption>Приоритет</FormCaption>
          <FormControl fullWidth size="small">
            <Controller
              control={form.control}
              name="priority"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onChange={(e) => field.onChange(e.target.value)}
                >
                  {TASK_PRIORITY_OPTIONS.map((opt) => (
                    <MenuItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </MenuItem>
                  ))}
                </Select>
              )}
            />
          </FormControl>
        </Stack>

        <Stack gap={0.5}>
          <FormCaption>Тип</FormCaption>
          <FormControl fullWidth size="small">
            <Controller
              control={form.control}
              name="type"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onChange={(e) => field.onChange(e.target.value)}
                >
                  <MenuItem value="TASK">Задача</MenuItem>
                  <MenuItem value="BUG">Баг</MenuItem>
                </Select>
              )}
            />
          </FormControl>
        </Stack>

        <Stack gap={0.5}>
          <FormCaption>Спринт</FormCaption>
          <FormControl fullWidth size="small">
            <Controller
              control={form.control}
              name="sprint"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onChange={(e) => field.onChange(e.target.value)}
                >
                  {sortedSprints.map((sprint) => (
                    <MenuItem key={sprint.id} value={sprint.id}>
                      {sprint.name} {sprint.isActive ? ' (Активный)' : ''}
                    </MenuItem>
                  ))}
                </Select>
              )}
            />
          </FormControl>
        </Stack>

        <Stack gap={0.5}>
          <FormCaption>Оценка</FormCaption>
          <TextField
            type="number"
            size="small"
            slotProps={{ htmlInput: { min: 0, max: ESTIMATION_MAX } }}
            {...form.register('estimation')}
            onChange={(e) => {
              const newValue = transformEstimaionByLimit(e.target.value)
              if (newValue === form.formState.defaultValues?.estimation) {
                form.resetField('estimation')
              } else {
                form.setValue('estimation', newValue, { shouldDirty: true })
              }
            }}
            placeholder="0"
            error={Boolean(errors.estimation)}
            helperText={errors.estimation?.message}
          />
        </Stack>

        <Divider />

        <Stack gap={1}>
          <MetaRow label="Проект" value={activeProject?.name ?? '—'} />
          <MetaRow
            label="Автор"
            value={formatUserName(task.creator) || '—'}
          />
          <MetaRow
            label="Создана"
            value={formatDateDDMMYYYY(task.createdAt)}
          />
          <MetaRow
            label="Обновлена"
            value={formatDateDDMMYYYY(task.updatedAt)}
          />
        </Stack>
      </Stack>
    </Stack>
  )
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <Stack direction="row" justifyContent="space-between" gap={1}>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="caption" sx={{ textAlign: 'right' }}>
        {value}
      </Typography>
    </Stack>
  )
}
