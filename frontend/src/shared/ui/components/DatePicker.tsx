import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import {
  DatePicker as MUIDatePicker,
  type DatePickerProps,
} from '@mui/x-date-pickers/DatePicker'
import { styled } from '@mui/material'
import { COLOR, TEXT_STYLES } from '@/shared/ui/theme/constants'
import CalendarIcon from '@/shared/assets/icons/calendar.svg?react'
import { ruRU } from '@mui/x-date-pickers/locales'
import 'dayjs/locale/ru' // Day.js Russian locale

export const StyledDatePicker = styled(MUIDatePicker)({
  '& .MuiPickersInputBase-root ': {
    borderRadius: '12px',
    backgroundColor: COLOR.background[100],
    height: '40px',

    color: COLOR.text.primary,
    ...TEXT_STYLES.body,
  },
  '&:hover .MuiPickersInputBase-root ': {
    borderColor: COLOR.main[500],
  },
  '& fieldset': { borderColor: COLOR.background[100] },
  '&:hover .MuiPickersInputBase-root fieldset': {
    borderColor: COLOR.main[500],
  },
  '& .Mui-focused fieldset': {
    borderWidth: 1.5,
  },
})

export function DatePicker(props: DatePickerProps) {
  return (
    <LocalizationProvider
      dateAdapter={AdapterDayjs}
      adapterLocale="ru"
      localeText={
        ruRU.components.MuiLocalizationProvider.defaultProps.localeText
      }
    >
      <StyledDatePicker
        slots={{ openPickerIcon: GrayCalenderIcon }}
        {...props}
      />
    </LocalizationProvider>
  )
}

const ColoredCalendarIcon = styled(CalendarIcon)<{ color: string }>`
  & .fill-color {
    fill: ${({ color }) => color};
  }

  & .stroke-color {
    stroke: ${({ color }) => color};
  }
`

const GrayCalenderIcon = () => {
  return <ColoredCalendarIcon color={COLOR.text.lightGray400} />
}
