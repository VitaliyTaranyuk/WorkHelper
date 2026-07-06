import { useEffect, useMemo } from 'react'
import { Divider, FormControl, Stack } from '@mui/material'
import { Controller, type UseFormReturn } from 'react-hook-form'
import { orderBy } from 'lodash'
import { MenuItem, Select } from '@/shared/ui/mui/Select'
import { TextField } from '@/shared/ui/mui/TextFileld'
import { FormCaption } from '@/shared/ui/components/FormCaption'
import { TaskDescriptionField } from './TaskDescriptionField'
import { Loader } from '@/shared/ui/components/Loader'
import { useProjectData } from '@/features/project/query/useProjectData'
import { useSprintsInfoQuery } from '@/features/sprint/query/useSprintsInfoQuery'
import { type FormValues } from './TaskForm/useTaskForm'
import { PendingAttachments } from './PendingAttachments'
import { TaskFormFields } from './TaskFormFields'
import { isBoardSprintId } from '@/entities/sprint/board'
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
 * колонка). Единый вид создания и редактирования; для Backlog-спринта
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
  // задачи (ТП-36). ТП-49: статус не зависит от спринта, колонка выбирается
  // и для задач бэклога (там она проявится при выводе задачи на доску).
  const boardStatuses = useMemo(
    () =>
      orderBy(
        (activeProject?.statuses ?? []).filter((s) => s.viewed),
        ['priority'],
      ),
    [activeProject?.statuses],
  )

  // Значение по умолчанию — первая колонка доски (как на бэкенде).
  const statusValue = form.watch('status')
  useEffect(() => {
    if (statusValue == null && boardStatuses.length > 0) {
      form.setValue('status', boardStatuses[0].id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusValue, boardStatuses])

  // ТП-74: колонку доски выбираем только для активного (доскового) спринта —
  // задачи бэклога/неактивного спринта на доску не попадают, статус для них
  // не имеет смысла. Переключение спринта в форме мгновенно меняет доступность.
  const selectedSprintId = form.watch('sprint')
  const statusApplicable =
    boardStatuses.length > 0 &&
    isBoardSprintId(sortedSprints, selectedSprintId)

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
          {/* ТП-112: кнопка «Надиктовать задачу» убрана — создание задачи
              голосом покрывает основной голосовой помощник (плавающий микрофон:
              «Создай задачу …»). Единая точка входа, без дублирования. */}
          <FormCaption>Название</FormCaption>
          {/* ТП-147: название опционально — при пустом поле сформируется из
              первой мысли описания (prepareTaskCard). */}
          <TextField
            fullWidth
            size="small"
            {...form.register('taskTitle')}
            error={Boolean(errors.taskTitle)}
            helperText={errors.taskTitle?.message}
            placeholder="Введите заголовок — или оставьте пустым, сформируем из описания"
          />
        </Stack>

        {/* Описание + панель инструментов (диктовка/счётчик) — единый компонент,
            одинаковый с карточкой редактирования (ТП-119). */}
        <TaskDescriptionField form={form} />

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
          backgroundColor: 'var(--wt-surface-muted)',
          borderRadius: '12px',
          p: 2,
          alignSelf: 'flex-start',
        }}
      >
        {/* ТП-76: порядок и термины как в карточке редактирования —
            «Статус» первым, затем исполнитель/приоритет/тип/спринт.
            ТП-74: поле показываем только для активного (доскового) спринта. */}
        {statusApplicable ? (
          <Stack gap={0.5}>
            <FormCaption>Статус</FormCaption>
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
                        {status.code}
                      </MenuItem>
                    ))}
                  </Select>
                )}
              />
            </FormControl>
          </Stack>
        ) : (
          boardStatuses.length > 0 && (
            <FormCaption>
              Статус доступен только для задач активного спринта
            </FormCaption>
          )
        )}

        <TaskFormFields
          form={form}
          projectUsers={projectUsers}
          sprints={sortedSprints}
        />
      </Stack>
    </Stack>
  )
}
