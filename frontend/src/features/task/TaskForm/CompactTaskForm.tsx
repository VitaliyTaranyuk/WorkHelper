import {
  Stack,
  FormControl,
  Typography,
  Box,
  FormHelperText,
} from '@mui/material'
import { Controller, type UseFormReturn } from 'react-hook-form'
import { NOT_ASSIGNED_OPTION, type FormValues } from './useTaskForm'
import {
  DateAndCreatorBlock,
  getPriorityChipSx,
  StyledRadioLabel,
} from './CompactTaskForm.styles'
import { getFullName } from '@/entities/user/utils'
import type { User } from '@/entities/user/types'
import { transformEstimaionByLimit } from './taskFormSchema'
import {
  ACTIVE_COLOR,
  TASK_PRIORITY_OPTIONS,
  TASK_TYPE_OPTIONS,
} from './contants'
import { createOptionNavigationHandler } from './utils'
import { ESTIMATION_MAX } from '@/entities/task/constants'
import { FormCaption } from '@/shared/ui/components/FormCaption'
import { MenuItem, Select } from '@/shared/ui/mui/Select'
import { TextField } from '@/shared/ui/mui/TextFileld'
import { useProjectData } from '@/features/project/query/useProjectData'
import { useMemo } from 'react'
import { Loader } from '@/shared/ui/components/Loader'
import { orderBy } from 'lodash'
import { useSprintsInfoQuery } from '@/features/sprint/query/useSprintsInfoQuery'

type BaseTaskFormProps = {
  onSubmit?: () => void
  form: UseFormReturn<FormValues>
  fullMode?: boolean
}

export type CreateTaskFormProps = BaseTaskFormProps & {
  mode: 'create'
}

export type EditTaskFormProps = BaseTaskFormProps & {
  mode: 'edit'
  // TODO: создать типы для Task в entity и использовать здесь
  staticTaskInfo: { createdAt: string; creator: User }
}

export type CompactTaskFormProps = CreateTaskFormProps | EditTaskFormProps

// возможно стоит перенести в entity, так как из бизнес действий тут только собсвенная валидация
// TODO: отрефакторить с выносом компонентов формы (подпись и содержание), стилей
export function CompactTaskForm(props: CompactTaskFormProps) {
  const { form } = props
  const { errors } = form.formState

  const { activeProject, isLoading: isProjectDataLoading } = useProjectData()
  const { data: sprints, isLoading: isSprintsInfoLoading } =
    useSprintsInfoQuery({ projectId: activeProject?.id })

  const projectUsers: User[] = useMemo(
    () => activeProject?.users || [],
    [activeProject?.users],
  )

  const sortedSprints = useMemo(
    () => orderBy(sprints, ['isActive', 'isDefault', 'name'], ['desc', 'desc']),
    [sprints],
  )

  if (isSprintsInfoLoading || isProjectDataLoading) {
    return <Loader isLoading={true} />
  }

  return (
    <Stack
      gap={'12px'}
      position={'relative'}
      paddingBottom={'19px'}
      component="form"
      onSubmit={props.onSubmit}
    >
      <Stack gap={'4px'} flexDirection={'column'}>
        <FormCaption>Заголовок</FormCaption>
        <TextField
          fullWidth
          size="small"
          {...form.register('taskTitle')}
          error={Boolean(errors.taskTitle)}
          helperText={errors.taskTitle?.message}
          placeholder="Введите заголовок"
        />
      </Stack>
      <Stack direction={'row'} spacing={'12px'}>
        <Stack direction={'column'} spacing={'12px'} width={'223px'}>
          <Stack
            direction={'column'}
            spacing={'4px'}
            component={'fieldset'}
            sx={{ border: 'none', padding: 0, margin: 0 }}
          >
            <FormCaption>Приоритет</FormCaption>
            <Controller
              control={form.control}
              name="priority"
              render={({ field }) => (
                <Box
                  tabIndex={0}
                  sx={{
                    display: 'flex',
                    gap: '12px',
                    padding: '8px',
                    height: '40px',
                    backgroundColor: 'rgba(246, 246, 246, 1)',
                    borderRadius: '12px',
                    alignItems: 'center',
                    boxSizing: 'border-box',
                    border: `1.5px solid transparent`,
                    outline: 'none',
                    '&:focus-within': {
                      border: `1.5px solid ${ACTIVE_COLOR}`,
                    },
                  }}
                  onKeyDown={createOptionNavigationHandler(
                    field,
                    TASK_PRIORITY_OPTIONS.map(({ value }) => value),
                  )}
                >
                  {TASK_PRIORITY_OPTIONS.map((opt) => {
                    const selected = field.value === opt.value
                    const sx = getPriorityChipSx(opt.value, selected)
                    const id = `priority-${opt.value}`
                    return (
                      <Box key={id} component="span">
                        <input
                          id={id}
                          type="radio"
                          name="priority"
                          value={opt.value}
                          checked={selected}
                          onChange={(e) => field.onChange(e.target.value)}
                          style={{
                            position: 'absolute',
                            opacity: 0,
                            width: 0,
                            height: 0,
                          }}
                        />
                        <Box component="label" htmlFor={id} sx={sx}>
                          {opt.label}
                        </Box>
                      </Box>
                    )
                  })}
                </Box>
              )}
            />
          </Stack>
          <Stack direction={'row'} spacing={'12px'}>
            <Stack
              direction={'column'}
              gap={'4px'}
              component={'fieldset'}
              padding={0}
              border={'none'}
            >
              <FormCaption>Тип</FormCaption>
              <Controller
                control={form.control}
                name="type"
                render={({ field }) => (
                  <Box
                    tabIndex={0}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '8px',
                      height: '40px',
                      backgroundColor: 'rgba(246, 246, 246, 1)',
                      borderRadius: '12px',
                      boxSizing: 'border-box',
                      border: `1.5px solid transparent`,
                      outline: 'none',
                      '&:focus-within': {
                        border: `1.5px solid ${ACTIVE_COLOR}`,
                      },
                    }}
                    onKeyDown={createOptionNavigationHandler(
                      field,
                      TASK_TYPE_OPTIONS.map(({ value }) => value),
                    )}
                  >
                    {TASK_TYPE_OPTIONS.map((opt) => {
                      const selected = field.value === opt.value
                      const id = `type-${opt.value}`
                      return (
                        <Stack
                          key={opt.value}
                          component="span"
                          justifyContent={'center'}
                          alignItems={'center'}
                          width={28}
                          height={24}
                          sx={{
                            borderRadius: '7px',
                            borderWidth: 1,
                            borderStyle: 'solid',
                            borderColor: selected
                              ? ACTIVE_COLOR
                              : 'transparent',
                          }}
                        >
                          <input
                            id={id}
                            type="radio"
                            name="type"
                            value={opt.value}
                            checked={selected}
                            onChange={(e) => field.onChange(e.target.value)}
                            style={{
                              position: 'absolute',
                              opacity: 0,
                              width: 0,
                              height: 0,
                            }}
                          />
                          <StyledRadioLabel htmlFor={id}>
                            {opt.label}
                          </StyledRadioLabel>
                        </Stack>
                      )
                    })}
                  </Box>
                )}
              />
            </Stack>

            <Stack direction={'column'} gap={'4px'} flexGrow={1}>
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
                    form.setValue('estimation', newValue, {
                      shouldDirty: true,
                    })
                  }
                }}
                placeholder="0"
                error={Boolean(errors.estimation)}
                helperText={errors.estimation?.message}
              />
            </Stack>
          </Stack>
        </Stack>

        <Stack direction={'column'} spacing={'12px'} flexGrow={1}>
          <Stack
            direction={'column'}
            spacing={'4px'}
            component={'fieldset'}
            sx={{ border: 'none', padding: 0, margin: 0 }}
          >
            <FormCaption>Исполнитель</FormCaption>
            <FormControl
              fullWidth
              size="small"
              error={Boolean(errors.assignee)}
            >
              <Controller
                control={form.control}
                name="assignee"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onChange={(e) => field.onChange(e.target.value)}
                  >
                    <MenuItem
                      key="NOT_ASSINGNED_OPTION"
                      value={NOT_ASSIGNED_OPTION.value}
                    >
                      {NOT_ASSIGNED_OPTION.label}
                    </MenuItem>
                    {projectUsers.map((user) => {
                      return (
                        <MenuItem key={user.id} value={user.id}>
                          {getFullName(user)}
                        </MenuItem>
                      )
                    })}
                  </Select>
                )}
              />
              {errors.assignee && (
                <FormHelperText>
                  {errors.assignee.message as string}
                </FormHelperText>
              )}
            </FormControl>
          </Stack>

          <Stack
            direction={'column'}
            spacing={'4px'}
            component={'fieldset'}
            sx={{ border: 'none', padding: 0, margin: 0 }}
          >
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
                      <MenuItem value={sprint.id}>
                        {sprint.name} {sprint.isActive && ` (Активный)`}
                      </MenuItem>
                    ))}
                  </Select>
                )}
              />
              {errors.sprint && (
                <FormHelperText>
                  {errors.sprint.message as string}
                </FormHelperText>
              )}
            </FormControl>
          </Stack>
        </Stack>
      </Stack>
      <Stack direction={'column'} gap={'4px'}>
        <FormCaption>Описание</FormCaption>
        <TextField
          fullWidth
          multiline
          minRows={props.fullMode ? 20 : 4}
          sx={{
            '& .MuiInputBase-root': {
              padding: '12px 11px',
            },
          }}
          {...form.register('description')}
          placeholder="Опишите задачу"
        />
      </Stack>
      {props.mode === 'edit' && (
        <DateAndCreatorBlock>
          <Typography variant="caption" color="text.secondary" height={'15px'}>
            <Stack gap={'12px'} direction={'row'}>
              <span>Дата создания: {props.staticTaskInfo.createdAt}</span>
              <span>
                Создатель: {props.staticTaskInfo.creator.lastName}{' '}
                {props.staticTaskInfo.creator.firstName}
              </span>
            </Stack>
          </Typography>
        </DateAndCreatorBlock>
      )}
      {/* скрытая кнопка для сабмита по Enter */}
      <button type="submit" style={{ display: 'none' }} />
    </Stack>
  )
}
