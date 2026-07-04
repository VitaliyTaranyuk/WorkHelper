import { FormControl, Stack, Typography } from '@mui/material'
import { Controller, type UseFormReturn } from 'react-hook-form'
import { FinishDateBlock, StyledTextField } from './SprintForm.styles'
import type { FormValues } from './useSprintForm'
import { COLOR } from '@/shared/ui/theme/constants'
import { FormCaption } from '@/shared/ui/components/FormCaption'
import { DatePicker } from '@/shared/ui/components/DatePicker'
import dayjs from 'dayjs'
import { getDifferenceInDays } from '@/shared/utils/date'

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
  const endDate = form.watch('endDate')

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
          {/* ТП-70: название опционально — спринт идентифицируют даты и статус */}
          <FormCaption>Название (необязательно)</FormCaption>
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
          <FormCaption>Дата завершения</FormCaption>
          {/* ТП-48: длительность задаётся датой завершения — тот же
              датапикер с календарём, что и у даты старта. */}
          <FormControl fullWidth size="small" error={Boolean(errors.endDate)}>
            <Controller
              control={form.control}
              name="endDate"
              render={({ field }) => (
                <DatePicker
                  disabled={props.isActivateMode}
                  {...field}
                  minDate={startDate ? dayjs(startDate) : undefined}
                  onChange={(date) => field.onChange(Number(date))}
                  value={field.value ? dayjs(field.value) : null}
                />
              )}
            />
          </FormControl>
          {errors.endDate && (
            <Typography variant="caption" color="error">
              {errors.endDate.message}
            </Typography>
          )}
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
      {!!startDate && !!endDate && endDate > startDate && (
        <FinishDateBlock>
          <Typography
            variant="caption"
            color={COLOR.text.tertiary}
            height={'15px'}
          >
            Длительность: {getDifferenceInDays(startDate, endDate)} дн.
          </Typography>
        </FinishDateBlock>
      )}
      {/* скрытая кнопка для сабмита по Enter */}
      <button type="submit" style={{ display: 'none' }} />
    </Stack>
  )
}
