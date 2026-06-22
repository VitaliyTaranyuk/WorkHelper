export type PossbleDateFormat = number | string | Date

const DAY_MS = 1000 * 60 * 60 * 24

export function makeDateObj(date: PossbleDateFormat): Date {
  return date instanceof Date ? date : new Date(date)
}

export function formatDateForBackend(date: PossbleDateFormat) {
  const dateObj = makeDateObj(date)

  return dateObj.toISOString().split('T')[0]
}

export function getShiftedDayDate({
  date,
  shiftDay,
}: {
  date: PossbleDateFormat
  shiftDay: number
}) {
  const dateObj = makeDateObj(date)
  dateObj.setDate(dateObj.getDate() + shiftDay)

  return dateObj
}

export function getEndDate({
  startDate,
  durationInDays,
}: {
  startDate: PossbleDateFormat | null
  durationInDays: number | null
}) {
  if (!startDate || !durationInDays) return null

  return getShiftedDayDate({
    date: startDate,
    shiftDay: durationInDays,
  })
}

export function formatToLocaleDate({
  date,
  locale = 'ru-RU',
  options = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  },
}: {
  date: PossbleDateFormat
  locale?: Intl.LocalesArgument
  options?: Intl.DateTimeFormatOptions
}) {
  const dateObj = makeDateObj(date)

  return dateObj.toLocaleDateString(locale, options)
}

export function formatDateDDMMYYYY(date: PossbleDateFormat) {
  const dateObj = makeDateObj(date)
  const dd = String(dateObj.getDate()).padStart(2, '0')
  const mm = String(dateObj.getMonth() + 1).padStart(2, '0')
  const yyyy = dateObj.getFullYear()
  return `${dd}-${mm}-${yyyy}`
}

export function getDifferenceInDays(
  date1: PossbleDateFormat,
  date2: PossbleDateFormat,
) {
  const dateObj1 = makeDateObj(date1)
  const dateObj2 = makeDateObj(date2)

  const diffInSecs = Math.abs(dateObj2.getTime() - dateObj1.getTime())

  return Math.round(diffInSecs / DAY_MS)
}

export function getFormattedDateRange(
  {
    start,
    end,
  }: {
    start: PossbleDateFormat
    end: PossbleDateFormat
  },
  locale: Intl.LocalesArgument = 'ru-RU',
) {
  const startObj = makeDateObj(start)
  const endObj = makeDateObj(end)

  const isSameYear = startObj.getFullYear() === endObj.getFullYear()

  const options: Intl.DateTimeFormatOptions = {
    ...(isSameYear ? {} : { year: '2-digit' }),
    month: '2-digit',
    day: '2-digit',
  }

  const formattedStart = startObj.toLocaleDateString(locale, options)
  const formattedEnd = endObj.toLocaleDateString(locale, options)

  if (formattedStart === formattedEnd) return formattedStart

  return `${formattedStart} - ${formattedEnd}`
}
