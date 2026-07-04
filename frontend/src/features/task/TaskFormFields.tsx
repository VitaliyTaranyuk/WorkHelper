import { Stack } from '@mui/material'
import FormControl from '@mui/material/FormControl'
import { Controller, type UseFormReturn } from 'react-hook-form'
import { MenuItem, Select } from '@/shared/ui/mui/Select'
import { FormCaption } from '@/shared/ui/components/FormCaption'
import { getFullName } from '@/entities/user/utils'
import { sprintDisplayLabel } from '@/entities/sprint/label'
import { NOT_ASSIGNED_OPTION, type FormValues } from './TaskForm/useTaskForm'
import { TASK_PRIORITY_OPTIONS } from './TaskForm/contants'
import type { User } from '@/entities/user/types'
import type { SprintMin } from '@/entities/sprint/type'

type Props = {
  form: UseFormReturn<FormValues>
  projectUsers: User[]
  sprints: SprintMin[]
}

/**
 * Общие поля правой панели карточки задачи (ТП-76): исполнитель, приоритет,
 * тип, спринт. Единая реализация для режимов создания (CreateTaskContent) и
 * редактирования (TaskCardContent) — одинаковый порядок, вид, термины и
 * поведение. Поле «Статус» рендерится отдельно над этими полями (у создания
 * и редактирования разный источник значения — колонка формы vs явное
 * сохранение ТП-34 — но визуально идентичен).
 */
export function TaskFormFields({ form, projectUsers, sprints }: Props) {
  return (
    <>
      <Stack gap={0.5}>
        <FormCaption>Исполнитель</FormCaption>
        <FormControl fullWidth size="small" error={Boolean(form.formState.errors.assignee)}>
          <Controller
            control={form.control}
            name="assignee"
            render={({ field }) => (
              <Select value={field.value} onChange={(e) => field.onChange(e.target.value)}>
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
              <Select value={field.value} onChange={(e) => field.onChange(e.target.value)}>
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
              <Select value={field.value} onChange={(e) => field.onChange(e.target.value)}>
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
              <Select value={field.value} onChange={(e) => field.onChange(e.target.value)}>
                {sprints.map((sprint) => (
                  <MenuItem key={sprint.id} value={sprint.id}>
                    {sprintDisplayLabel(sprint)}
                    {sprint.isActive ? ' (Активный)' : ''}
                  </MenuItem>
                ))}
              </Select>
            )}
          />
        </FormControl>
      </Stack>
    </>
  )
}
