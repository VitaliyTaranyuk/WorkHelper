import { Stack, ToggleButton, ToggleButtonGroup } from '@mui/material'
import FormControl from '@mui/material/FormControl'
import { Controller, type UseFormReturn } from 'react-hook-form'
import { MenuItem, Select } from '@/shared/ui/mui/Select'
import { FormCaption } from '@/shared/ui/components/FormCaption'
import { getFullName } from '@/entities/user/utils'
import { sprintDisplayLabel } from '@/entities/sprint/label'
import { NOT_ASSIGNED_OPTION, type FormValues } from './TaskForm/useTaskForm'
import { TASK_PRIORITY_OPTIONS, PRIORITY_COLOR } from './TaskForm/contants'
import BugIcon from '@/shared/assets/icons/task-type-bug.svg?react'
import TaskIcon from '@/shared/assets/icons/task-type-task.svg?react'
import type { User } from '@/entities/user/types'
import type { SprintMin } from '@/entities/sprint/type'

// ТП-82: сегментированные переключатели типа и приоритета — единый паттерн с
// переключателем вида календаря (MUI ToggleButtonGroup). Один клик, без меню;
// активный вариант визуально выделен. Тип — иконки задача/баг; приоритет —
// подсвечен своим цветом (PRIORITY_COLOR: зелёный/жёлтый/красный).
const TYPE_OPTIONS = [
  { value: 'TASK', label: 'Задача', Icon: TaskIcon },
  { value: 'BUG', label: 'Баг', Icon: BugIcon },
] as const

const segmentSx = {
  textTransform: 'none' as const,
  fontSize: 13,
  fontWeight: 500,
  gap: 0.75,
  py: 0.75,
  '& svg': { width: 16, height: 16 },
}

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
      {/* ТП-85: порядок полей — Статус (рендерится выше карточкой), Спринт,
          Исполнитель, Приоритет, Тип. «Спринт» сразу под «Статусом» — они
          логически связаны и чаще всего меняются вместе (паттерн Jira/Linear). */}
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
        <Controller
          control={form.control}
          name="priority"
          render={({ field }) => (
            <ToggleButtonGroup
              exclusive
              fullWidth
              size="small"
              value={field.value}
              onChange={(_, v: string | null) => v && field.onChange(v)}
            >
              {TASK_PRIORITY_OPTIONS.map((opt) => (
                <ToggleButton
                  key={opt.value}
                  value={opt.value}
                  sx={{
                    ...segmentSx,
                    '&.Mui-selected, &.Mui-selected:hover': {
                      backgroundColor: PRIORITY_COLOR[opt.value],
                      // ТП-158: пастельный фон всегда светлый — текст фиксируем
                      // тёмным, иначе в тёмной теме он наследовал светлый цвет
                      // и терял контраст.
                      color: '#313131',
                    },
                  }}
                >
                  {opt.label}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          )}
        />
      </Stack>

      <Stack gap={0.5}>
        <FormCaption>Тип</FormCaption>
        <Controller
          control={form.control}
          name="type"
          render={({ field }) => (
            <ToggleButtonGroup
              exclusive
              fullWidth
              size="small"
              value={field.value}
              onChange={(_, v: string | null) => v && field.onChange(v)}
            >
              {TYPE_OPTIONS.map(({ value, label, Icon }) => (
                <ToggleButton key={value} value={value} sx={segmentSx}>
                  <Icon />
                  {label}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          )}
        />
      </Stack>
    </>
  )
}
