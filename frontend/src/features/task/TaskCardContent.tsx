import { useEffect, useMemo, useState, type MutableRefObject } from 'react'
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
import { orderBy } from 'lodash'
import { MUIPrimaryButton } from '@/shared/ui/Button'
import { MenuItem, Select } from '@/shared/ui/mui/Select'
import { TextField } from '@/shared/ui/mui/TextFileld'
import { FormCaption } from '@/shared/ui/components/FormCaption'
import { Loader } from '@/shared/ui/components/Loader'
import { useProjectData } from '@/features/project/query/useProjectData'
import { useSprintsInfoQuery } from '@/features/sprint/query/useSprintsInfoQuery'
import { isBoardSprintId } from '@/entities/sprint/board'
import { useEditTaskForm } from './TaskForm/useTaskForm'
import { useEditTask } from './mutation/useEditTask'
import { useDeleteTask } from './mutation/useDeleteTask'
import { useUpdateTaskStatus } from './mutation/useUpdateTaskStatus'
import { TaskComments } from './TaskComments'
import { TaskHistory } from './TaskHistory'
import { TaskAttachments } from './TaskAttachments'
import { TaskLinks } from './TaskLinks'
import { TaskDevPanel } from './TaskDevPanel'
import { DictationButton } from '@/features/voice/DictationButton'
import { TaskFormFields } from './TaskFormFields'
import { formatUserName } from '@/entities/user/utils'
import { formatDateDDMMYYYY } from '@/shared/utils/date'
import type { ITaskCard } from '@/entities/task/types'
import type { User } from '@/entities/user/types'
import { notify as toast } from '@/shared/ui/notify'
import {
  extractFieldErrors,
  extractGeneralError,
} from '@/shared/api/extractFieldErrors'

/**
 * Интерфейс защиты от потери несохранённых изменений (ТП-34): контейнер
 * (модалка/страница) перед закрытием спрашивает isDirty и может вызвать save.
 */
export type TaskCardGuard = {
  isDirty: boolean
  /** Сохранить всё (поля + статус). true — успех, можно закрывать. */
  save: () => Promise<boolean>
}

type TaskCardContentProps = {
  task: ITaskCard
  /** Вызывается после успешного удаления задачи (закрыть модалку / уйти со страницы). */
  onDeleted?: () => void
  /** Контейнер получает актуальные isDirty/save для guard-а закрытия (ТП-34). */
  guardRef?: MutableRefObject<TaskCardGuard | null>
}

/**
 * Маппинг backend-полей (из MethodArgumentNotValidException) на form-поля
 * RHF. Backend кидает имя поля DTO (title, taskType, sprintId, ...), а
 * useEditTaskForm в проекте использует другие имена (taskTitle, type, sprint).
 */
const BACKEND_TO_FORM_FIELD: Record<
  string,
  'taskTitle' | 'priority' | 'type' | 'assignee' | 'sprint' | 'description'
> = {
  title: 'taskTitle',
  taskTitle: 'taskTitle',
  priority: 'priority',
  taskType: 'type',
  type: 'type',
  assignee: 'assignee',
  sprintId: 'sprint',
  sprint: 'sprint',
  description: 'description',
}

/**
 * Единое тело карточки задачи (Linear/Jira-стиль): слева — рабочая область
 * (название, описание, активность: комментарии + история), справа — метаданные
 * (статус, исполнитель, приоритет, тип, спринт, проект, даты, автор).
 *
 * Используется и в модальном окне (TaskCardModal), и на отдельной странице
 * (EditTaskPage, для deep-link из уведомлений). Единственная реализация —
 * никакого «обычная/расширенная» разделения.
 */
export function TaskCardContent({ task, onDeleted, guardRef }: TaskCardContentProps) {
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
  // Статус — часть явного сохранения (ТП-34): выбор в дропдауне меняет только
  // локальное значение, на сервер уходит по кнопке «Сохранить».
  // baselineStatusId — последнее сохранённое значение (task из пропсов не
  // обновляется после мутации, пока родитель не перезапросит список).
  const [statusId, setStatusId] = useState<number>(task.status.id)
  const [baselineStatusId, setBaselineStatusId] = useState<number>(task.status.id)

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

  // ТП-74: статус доски осмыслен только для задачи доскового спринта
  // (активного; без активного — Backlog). При выборе бэклога/неактивного
  // спринта поле «Статус» скрываем и не отправляем его изменение — так же,
  // как это проверяет бэкенд. Реагирует на смену спринта в форме без перезагрузки.
  const selectedSprintId = form.watch('sprint')
  const statusApplicable = isBoardSprintId(sortedSprints, selectedSprintId)

  const isStatusDirty = statusApplicable && statusId !== baselineStatusId
  const isFormDirty = Object.keys(form.formState.dirtyFields).length > 0

  /**
   * Единое явное сохранение (ТП-34): поля формы и статус уходят на сервер
   * только по кнопке «Сохранить». Возвращает true при полном успехе.
   */
  const saveAll = async (formValues: Parameters<Parameters<typeof form.handleSubmit>[0]>[0]) => {
    if (!activeProject) return false
    try {
      if (isFormDirty) {
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
            ...(formValues.description
              ? { description: formValues.description }
              : {}),
          },
        })
        form.reset({ ...formValues })
      }
      if (isStatusDirty) {
        await updateStatus.mutateAsync({
          taskId: task.id,
          projectId: activeProject.id,
          statusId,
        })
        setBaselineStatusId(statusId)
      }
      return true
    } catch (err) {
      // Jira/Linear UX: показываем причину рядом с полем, не общий toast.
      const fieldErrors = extractFieldErrors(err)
      if (fieldErrors) {
        for (const [backendField, message] of Object.entries(fieldErrors)) {
          const formField = BACKEND_TO_FORM_FIELD[backendField]
          if (formField) {
            form.setError(formField, { type: 'server', message })
          }
        }
        // Поля, которые не маппятся (например status) — добавляем сводку в toast,
        // чтобы пользователь увидел причину.
        const unmapped = Object.entries(fieldErrors)
          .filter(([k]) => !BACKEND_TO_FORM_FIELD[k])
          .map(([k, v]) => `${k}: ${v}`)
        if (unmapped.length) toast.error(unmapped.join('; '))
      } else {
        const general = extractGeneralError(err)
        toast.error(general ?? 'Не удалось сохранить изменения')
      }
      return false
    }
  }

  const onSubmit = form.handleSubmit(async (formValues) => {
    await saveAll(formValues)
  })

  /** Сохранение для guard-а закрытия: прогоняет валидацию и возвращает успех. */
  const saveForGuard = async () => {
    let ok = false
    await form.handleSubmit(async (formValues) => {
      ok = await saveAll(formValues)
    })()
    return ok
  }

  const isDirty = isFormDirty || isStatusDirty

  // Актуальные isDirty/save для контейнера (модалка) — без ре-рендеров родителя.
  if (guardRef) {
    guardRef.current = { isDirty, save: saveForGuard }
  }

  // Страховка от потери при закрытии вкладки/перезагрузке (как в Jira/Linear).
  useEffect(() => {
    if (!isDirty) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isDirty])

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
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
          >
            <FormCaption>Название</FormCaption>
            {/* ТП-88: диктовка названия голосом — текст добавляется в поле. */}
            <DictationButton
              field="title"
              targetLabel="название"
              onText={(text) => {
                const current = form.getValues('taskTitle') ?? ''
                form.setValue(
                  'taskTitle',
                  current ? `${current} ${text}` : text,
                  { shouldDirty: true, shouldValidate: true },
                )
              }}
            />
          </Stack>
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
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <FormCaption>Описание</FormCaption>
            {/* ТП-58: диктовка описания голосом — текст добавляется в поле */}
            <DictationButton
              targetLabel="описание"
              onText={(text) => {
                const current = form.getValues('description') ?? ''
                form.setValue(
                  'description',
                  current ? `${current}\n${text}` : text,
                  { shouldDirty: true },
                )
              }}
            />
          </Stack>
          {/* Большие тексты (тех. задания, спецификации, 500+ строк) должны
              быть полностью читаемы/редактируемы. Решение по образцу Jira/Linear:
              минимум 8 строк, рост до 24 строк, дальше — внутренний скролл
              textarea (overflow: auto в самом input). Карточку не распирает. */}
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
            placeholder="Опишите задачу — поддерживаются длинные тексты, переносы строк, markdown"
          />
        </Stack>

        <Stack gap={1.5} direction="row">
          <MUIPrimaryButton
            disabled={
              !form.formState.isValid ||
              !isDirty ||
              editTask.isPending ||
              updateStatus.isPending
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

        {/* Вложения — сразу под описанием, компактный список (Jira/ClickUp). */}
        {activeProject && (
          <TaskAttachments projectId={activeProject.id} taskId={task.id} />
        )}

        <Divider />

        {/* Панель «Разработка» (ТП-21): ветки и PR GitHub по коду задачи. */}
        {activeProject && (
          <TaskDevPanel
            projectId={activeProject.id}
            taskId={task.id}
            taskCode={task.code}
          />
        )}

        <Divider />

        {/* Активность: комментарии + связи (ТП-51) + история */}
        <Box>
          <Tabs
            value={activityTab}
            onChange={(_, v) => setActivityTab(v)}
            sx={{ minHeight: 36, mb: 1 }}
          >
            <Tab label="Комментарии" sx={{ minHeight: 36, py: 0 }} />
            <Tab label="Связи" sx={{ minHeight: 36, py: 0 }} />
            <Tab label="История" sx={{ minHeight: 36, py: 0 }} />
          </Tabs>
          {activityTab === 0 && activeProject && (
            <TaskComments projectId={activeProject.id} taskId={task.id} />
          )}
          {activityTab === 1 && activeProject && (
            <TaskLinks
              projectId={activeProject.id}
              taskId={task.id}
              taskCode={task.code}
            />
          )}
          {activityTab === 2 && activeProject && (
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
        {/* ТП-74: «Статус» — только для задачи активного (доскового) спринта. */}
        {statusApplicable ? (
          <Stack gap={0.5}>
            <FormCaption>Статус</FormCaption>
            <FormControl fullWidth size="small">
              {/* Явное сохранение (ТП-34): выбор меняет только локальное
                  значение, на сервер уходит по кнопке «Сохранить». */}
              <Select
                value={statusId}
                onChange={(e) => setStatusId(Number(e.target.value))}
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
        ) : (
          <FormCaption>
            Статус доступен только для задач активного спринта
          </FormCaption>
        )}

        {/* ТП-76: те же поля и порядок, что в форме создания (общий компонент) */}
        <TaskFormFields
          form={form}
          projectUsers={projectUsers}
          sprints={sortedSprints}
        />

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
