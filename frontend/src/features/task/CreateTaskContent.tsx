import { useEffect, useMemo } from 'react'
import { Divider, FormControl, Stack } from '@mui/material'
import { Controller, type UseFormReturn } from 'react-hook-form'
import { orderBy } from 'lodash'
import { MenuItem, Select } from '@/shared/ui/mui/Select'
import { TextField } from '@/shared/ui/mui/TextFileld'
import { FormCaption } from '@/shared/ui/components/FormCaption'
import { Loader } from '@/shared/ui/components/Loader'
import { useProjectData } from '@/features/project/query/useProjectData'
import { useSprintsInfoQuery } from '@/features/sprint/query/useSprintsInfoQuery'
import { NOT_ASSIGNED_OPTION, type FormValues } from './TaskForm/useTaskForm'
import { transformEstimaionByLimit } from './TaskForm/taskFormSchema'
import { TASK_PRIORITY_OPTIONS } from './TaskForm/contants'
import { PendingAttachments } from './PendingAttachments'
import { getFullName } from '@/entities/user/utils'
import { ESTIMATION_MAX } from '@/entities/task/constants'
import type { User } from '@/entities/user/types'

type CreateTaskContentProps = {
  form: UseFormReturn<FormValues>
  onSubmit?: () => void
  /** Отложенные вложения (ТП-30): загружаются к задаче после создания. */
  pendingFiles?: File[]
  onPendingFilesChange?: (files: File[]) => void
}

/**
 * Тело формы создания задачи в макете карточки редактирования
 * (TaskCardContent): слева — название, описание и вложения (грузятся после
 * создания, ТП-30), справа — метаданные (исполнитель, приоритет, тип, спринт,
 * колонка, оценка). Единый вид создания и редактирования; для Backlog-спринта
 * выбор колонки скрыт — статус фиксирован инвариантом (TaskPlacementService).
 */
export function CreateTaskContent({
  form,
  onSubmit,
  pendingFiles,
  onPendingFilesChange,
}: CreateTaskContentProps) {
  const { errors } = form.formState
  const { activeProject, isLoading: isProjectLoading } = useProjectData()
  const { data: sprints, isLoading: isSprintsLoading } = useSprintsInfoQuery({
    projectId: activeProject?.id,
  })

  const projectUsers: User[] = useMemo(
    () => activeProject?.users || [],
    [activeProject?.users],
  )

  // Только активные спринты и Backlog — как в карточке редактирования.
  const sortedSprints = useMemo(
    () =>
      orderBy(
        (sprints ?? []).filter((s) => s.isActive || s.isDefault),
        ['isActive', 'isDefault', 'name'],
        ['desc', 'desc'],
      ),
    [sprints],
  )

  // Видимые колонки доски в порядке отображения — выбор колонки для новой
  // задачи (ТП-36). В Backlog-спринте колонка не выбирается.
  const boardStatuses = useMemo(
    () =>
      orderBy(
        (activeProject?.statuses ?? []).filter((s) => s.viewed),
        ['priority'],
      ),
    [activeProject?.statuses],
  )
  const selectedSprintId = form.watch('sprint')
  const isBacklogSprint = Boolean(
    sortedSprints.find((s) => s.id === selectedSprintId)?.isDefault,
  )

  // Синхронизация значения колонки с выбранным спринтом: Backlog — колонки
  // нет (null), обычный спринт — по умолчанию первая колонка доски.
  const statusValue = form.watch('status')
  useEffect(() => {
    if (isBacklogSprint) {
      if (statusValue != null) form.setValue('status', null)
    } else if (statusValue == null && boardStatuses.length > 0) {
      form.setValue('status', boardStatuses[0].id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isBacklogSprint, statusValue, boardStatuses])

  if (isProjectLoading || isSprintsLoading) {
    return <Loader isLoading />
  }

  return (
    <Stack
      component="form"
      onSubmit={onSubmit}
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
            maxRows={24}
            slotProps={{
              htmlInput: {
                style: { overflowY: 'auto', resize: 'vertical' },
                maxLength: 4096,
              },
            }}
            sx={{
              '& .MuiInputBase-root': { padding: '12px 11px' },
              '& textarea': {
                lineHeight: 1.5,
                fontFamily:
                  'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
                fontSize: 13,
              },
            }}
            error={Boolean(errors.description)}
            helperText={
              errors.description?.message ??
              `${(form.watch('description') ?? '').length}/4096`
            }
            {...form.register('description')}
            placeholder="Опишите задачу — поддерживаются длинные тексты, переносы строк"
          />
        </Stack>

        <Divider />

        {/* Вложения при создании (ТП-30): диск / drag&drop / Ctrl+V. */}
        {pendingFiles !== undefined && onPendingFilesChange && (
          <PendingAttachments
            files={pendingFiles}
            onChange={onPendingFilesChange}
          />
        )}
      </Stack>

      {/* ПРАВАЯ КОЛОНКА — метаданные (как в карточке редактирования) */}
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

        {!isBacklogSprint && boardStatuses.length > 0 && (
          <Stack gap={0.5}>
            <FormCaption>Колонка</FormCaption>
            <FormControl fullWidth size="small">
              <Controller
                control={form.control}
                name="status"
                render={({ field }) => (
                  <Select
                    value={field.value ?? boardStatuses[0].id}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  >
                    {boardStatuses.map((status) => (
                      <MenuItem key={status.id} value={status.id}>
                        {status.description || status.code}
                      </MenuItem>
                    ))}
                  </Select>
                )}
              />
            </FormControl>
          </Stack>
        )}

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
      </Stack>
    </Stack>
  )
}
