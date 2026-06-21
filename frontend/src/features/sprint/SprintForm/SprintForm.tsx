import { FormControl, Stack, Typography } from '@mui/material'
import { Controller, type UseFormReturn } from 'react-hook-form'
import { FinishDateBlock, StyledTextField } from './SprintForm.styles'
import type { FormValues } from './useSprintForm'
import { SPRINT_DURATION_MAX } from '@/entities/sprint/constants'
import { transformDurationByLimit } from './sprintFormSchema'
import { COLOR } from '@/shared/ui/theme/constants'
import { FormCaption } from '@/shared/ui/components/FormCaption'
import { DatePicker } from '@/shared/ui/components/DatePicker'
import dayjs from 'dayjs'
import { formatToLocaleDate, getShiftedDayDate } from '@/shared/utils/date'

type SprintFormProps = {
  onSubmit?: () => void
  form: UseFormReturn<FormValues>
  isActivateMode?: boolean
}

// TODO: отрефакторить с выносом компонентов формы (подпись и содержание), стилей
export function SprintForm(props: SprintFormProps) {
  const { form } = props
  const { errors } = form.formState

  const startDate = form.watch('startDate')
  const duration = form.watch('duration')

  return (
    <Stack
      gap={'12px'}
      position={'relative'}
      paddingBottom={'19px'}
      component="form"
      onSubmit={props.onSubmit}
    >
      {!props.isActivateMode && (
        <Stack gap={'4px'} flexDirection={'column'}>
          <FormCaption>Заголовок</FormCaption>
          <StyledTextField
            fullWidth
            size="small"
            {...form.register('name')}
            error={Boolean(errors.name)}
            helperText={errors.name?.message}
            placeholder="Название спринта"
          />
        </Stack>
      )}
      <Stack direction={'row'} spacing={'12px'}>
        <Stack gap={'4px'} flexDirection={'column'} width={'50%'}>
          <FormCaption>Дата старта</FormCaption>
          <FormControl fullWidth size="small" error={Boolean(errors.startDate)}>
            <Controller
              control={form.control}
              name="startDate"
              render={({ field }) => (
                <DatePicker
                  disabled={props.isActivateMode}
                  {...field}
                  onChange={(date) => {
                    return field.onChange(Number(date))
                  }}
                  value={
                    props.isActivateMode
                      ? dayjs(new Date())
                      : field.value
                        ? dayjs(field.value)
                        : null
                  }
                />
              )}
            />
          </FormControl>
        </Stack>

        <Stack direction={'column'} gap={'4px'} width={'50%'}>
          <FormCaption>Длительность</FormCaption>
          <StyledTextField
            type="number"
            size="small"
            disabled={props.isActivateMode}
            slotProps={{ htmlInput: { min: 0, max: SPRINT_DURATION_MAX } }}
            {...form.register('duration', {
              setValueAs: (value) => (!value ? null : Number(value)),
            })}
            onChange={(e) => {
              const newValue = transformDurationByLimit(e.target.value)

              if (newValue === form.formState.defaultValues?.duration) {
                form.resetField('duration')
              } else {
                form.setValue('duration', newValue, {
                  shouldDirty: true,
                })
              }
            }}
            placeholder="0"
            error={Boolean(errors.duration)}
            helperText={errors.duration?.message}
          />
        </Stack>
      </Stack>
      <Stack direction={'column'} gap={'4px'}>
        <FormCaption>Цели</FormCaption>
        <StyledTextField
          disabled={props.isActivateMode}
          fullWidth
          multiline
          minRows={7}
          sx={{
            '& .MuiInputBase-root': {
              padding: '12px 11px',
            },
          }}
          {...form.register('goal')}
          placeholder="Опишите задачу"
        />
      </Stack>
      {!!startDate && !!duration && (
        <FinishDateBlock>
          <Typography
            variant="caption"
            color={COLOR.text.tertiary}
            height={'15px'}
          >
            Дата завершения:{' '}
            {formatToLocaleDate({
              date: getShiftedDayDate({ date: startDate, shiftDay: duration }),
            })}
          </Typography>
        </FinishDateBlock>
      )}
      {/* скрытая кнопка для сабмита по Enter */}
      <button type="submit" style={{ display: 'none' }} />
    </Stack>
  )
}
