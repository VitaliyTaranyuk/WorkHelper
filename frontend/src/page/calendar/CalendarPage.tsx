import { useEffect, useMemo, useState } from 'react'
import {
  Box,
  Button,
  Chip,
  IconButton,
  MenuItem,
  Select,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import VideocamOutlinedIcon from '@mui/icons-material/VideocamOutlined'
import dayjs, { type Dayjs } from 'dayjs'
import { useProjectData } from '@/features/project/query/useProjectData'
import {
  useCreateMeeting,
  useDeleteMeeting,
  useMeetings,
  useUpdateMeeting,
} from '@/features/meeting/useMeetings'
import type { MeetingDto } from '@/shared/api/endpoint/meetingsApi'
import { MeetingDetailsDialog } from './MeetingDetailsDialog'

type Props = { projectId: string; focusMeetingId?: string }

type CalendarView = 'week' | 'month'

const TELEMOST_CREATE_URL = 'https://telemost.yandex.ru/create'
const LINK_PATTERN = /^https?:\/\/.+/
const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

function withSeconds(local: string): string {
  // datetime-local -> "yyyy-MM-ddTHH:mm" ; backend expects seconds
  return local.length === 16 ? `${local}:00` : local
}

/** Понедельник недели, в которую входит дата (dayjs .day(): 0 = воскресенье). */
function startOfWeek(date: Dayjs): Dayjs {
  return date.startOf('day').subtract((date.day() + 6) % 7, 'day')
}

/** Бэкенд принимает строго "yyyy-MM-ddTHH:mm:ss" — обрезаем возможные доли секунд. */
function toBackendDateTime(iso: string): string {
  return withSeconds(iso).slice(0, 19)
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function CalendarPage({ projectId, focusMeetingId }: Props) {
  const { data: meetings } = useMeetings(projectId)
  const createMeeting = useCreateMeeting(projectId)
  const updateMeeting = useUpdateMeeting(projectId)
  const deleteMeeting = useDeleteMeeting(projectId)

  // Участники встречи выбираются из участников проекта: встречи привязаны
  // к проекту, а GET /users доступен только ADMIN/PROJECT_OWNER (участник
  // проекта получал 403 при открытии календаря).
  const { activeProject } = useProjectData()
  const users = activeProject?.users

  const [view, setView] = useState<CalendarView>('month')
  const [anchor, setAnchor] = useState<Dayjs>(dayjs())
  const [selectedMeeting, setSelectedMeeting] = useState<MeetingDto | null>(null)

  const [title, setTitle] = useState('')
  const [startAt, setStartAt] = useState('')
  const [endAt, setEndAt] = useState('')
  const [link, setLink] = useState('')
  const [participantIds, setParticipantIds] = useState<string[]>([])

  const linkTrimmed = link.trim()
  const linkValid = linkTrimmed.length === 0 || LINK_PATTERN.test(linkTrimmed)
  const valid = title.trim().length > 0 && startAt.length > 0 && linkValid

  // Переход из уведомления-напоминания: открыть запись встречи (ТП-37).
  useEffect(() => {
    if (!focusMeetingId || !meetings) return
    const meeting = meetings.find((m) => m.id === focusMeetingId)
    if (meeting) {
      setAnchor(dayjs(meeting.startAt))
      setSelectedMeeting(meeting)
    }
  }, [focusMeetingId, meetings])

  const meetingsByDay = useMemo(() => {
    const map = new Map<string, MeetingDto[]>()
    for (const m of meetings ?? []) {
      const key = dayjs(m.startAt).format('YYYY-MM-DD')
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(m)
    }
    for (const list of map.values())
      list.sort((a, b) => +new Date(a.startAt) - +new Date(b.startAt))
    return map
  }, [meetings])

  const days = useMemo(() => {
    if (view === 'week') {
      const start = startOfWeek(anchor)
      return Array.from({ length: 7 }, (_, i) => start.add(i, 'day'))
    }
    const start = startOfWeek(anchor.startOf('month'))
    return Array.from({ length: 42 }, (_, i) => start.add(i, 'day'))
  }, [view, anchor])

  const monthLabel = anchor
    .toDate()
    .toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })
  const periodLabel =
    view === 'month'
      ? monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)
      : `${startOfWeek(anchor).format('DD.MM')} – ${startOfWeek(anchor).add(6, 'day').format('DD.MM.YYYY')}`

  const shift = (direction: 1 | -1) =>
    setAnchor(anchor.add(direction, view === 'month' ? 'month' : 'week'))

  const submit = async () => {
    if (!valid) return
    await createMeeting.mutateAsync({
      title: title.trim(),
      startAt: withSeconds(startAt),
      endAt: endAt ? withSeconds(endAt) : undefined,
      link: linkTrimmed.length > 0 ? linkTrimmed : undefined,
      participantIds,
    })
    setTitle('')
    setStartAt('')
    setEndAt('')
    setLink('')
    setParticipantIds([])
  }

  const saveLink = (meeting: MeetingDto, newLink: string) => {
    updateMeeting.mutate(
      {
        meetingId: meeting.id,
        data: {
          title: meeting.title,
          description: meeting.description ?? undefined,
          startAt: toBackendDateTime(meeting.startAt),
          endAt: meeting.endAt ? toBackendDateTime(meeting.endAt) : undefined,
          link: newLink.length > 0 ? newLink : undefined,
          participantIds: meeting.participants.map((p) => p.id),
        },
      },
      {
        onSuccess: (r) => setSelectedMeeting(r.data),
      },
    )
  }

  const removeMeeting = (meetingId: string) => {
    deleteMeeting.mutate(meetingId)
    setSelectedMeeting(null)
  }

  const today = dayjs().format('YYYY-MM-DD')

  const renderMeetingChip = (m: MeetingDto) => (
    <Chip
      key={m.id}
      size="small"
      icon={m.link ? <VideocamOutlinedIcon /> : undefined}
      label={`${formatTime(m.startAt)} ${m.title}`}
      onClick={() => setSelectedMeeting(m)}
      sx={{
        justifyContent: 'flex-start',
        maxWidth: '100%',
        backgroundColor: 'rgba(99,102,241,0.1)',
        '&:hover': { backgroundColor: 'rgba(99,102,241,0.2)' },
      }}
    />
  )

  return (
    <Stack direction="row" gap={4} sx={{ p: 2 }}>
      <Stack gap={1.5} sx={{ width: 320, flexShrink: 0 }}>
        <Typography variant="h6">Новая встреча</Typography>
        <TextField
          label="Название"
          size="small"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <TextField
          label="Начало"
          type="datetime-local"
          size="small"
          value={startAt}
          onChange={(e) => setStartAt(e.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <TextField
          label="Окончание"
          type="datetime-local"
          size="small"
          value={endAt}
          onChange={(e) => setEndAt(e.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <Select
          multiple
          size="small"
          displayEmpty
          value={participantIds}
          onChange={(e) => setParticipantIds(e.target.value as string[])}
          renderValue={(selected) =>
            selected.length === 0 ? 'Участники' : `Участников: ${selected.length}`
          }
        >
          {(users ?? []).map((u) => (
            <MenuItem key={u.id} value={u.id}>
              {u.firstName} {u.lastName}
            </MenuItem>
          ))}
        </Select>
        <TextField
          label="Ссылка на встречу"
          size="small"
          placeholder="https://telemost.yandex.ru/j/…"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          error={!linkValid}
          helperText={
            !linkValid
              ? 'Ссылка должна начинаться с http:// или https://'
              : undefined
          }
        />
        <Button
          variant="outlined"
          startIcon={<VideocamOutlinedIcon />}
          onClick={() =>
            window.open(TELEMOST_CREATE_URL, '_blank', 'noopener,noreferrer')
          }
        >
          Создать встречу в Телемосте
        </Button>
        <Typography variant="caption" color="text.secondary">
          Телемост откроется в новой вкладке — скопируйте оттуда ссылку на
          встречу и вставьте её в поле выше.
        </Typography>
        <Button
          variant="contained"
          disabled={!valid || createMeeting.isPending}
          onClick={submit}
        >
          Создать встречу
        </Button>
      </Stack>

      <Stack gap={1.5} sx={{ flex: 1, minWidth: 0 }}>
        <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap">
          <Typography variant="h6" sx={{ flex: 1 }}>
            {periodLabel}
          </Typography>
          <Button size="small" onClick={() => setAnchor(dayjs())}>
            Сегодня
          </Button>
          <IconButton size="small" aria-label="Назад" onClick={() => shift(-1)}>
            <ChevronLeftIcon />
          </IconButton>
          <IconButton size="small" aria-label="Вперёд" onClick={() => shift(1)}>
            <ChevronRightIcon />
          </IconButton>
          <ToggleButtonGroup
            size="small"
            exclusive
            value={view}
            onChange={(_, v: CalendarView | null) => v && setView(v)}
          >
            <ToggleButton value="week">Неделя</ToggleButton>
            <ToggleButton value="month">Месяц</ToggleButton>
          </ToggleButtonGroup>
        </Stack>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: '1px',
            backgroundColor: 'divider',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 2,
            overflow: 'hidden',
          }}
        >
          {WEEKDAYS.map((label) => (
            <Box
              key={label}
              sx={{ p: 0.5, textAlign: 'center', backgroundColor: 'background.paper' }}
            >
              <Typography variant="caption" color="text.secondary">
                {label}
              </Typography>
            </Box>
          ))}
          {days.map((day) => {
            const key = day.format('YYYY-MM-DD')
            const dayMeetings = meetingsByDay.get(key) ?? []
            const isToday = key === today
            const outsideMonth = view === 'month' && !day.isSame(anchor, 'month')
            return (
              <Stack
                key={key}
                gap={0.5}
                sx={{
                  p: 0.75,
                  minHeight: view === 'month' ? 96 : 320,
                  backgroundColor: 'background.paper',
                  opacity: outsideMonth ? 0.45 : 1,
                }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    alignSelf: 'flex-start',
                    fontWeight: isToday ? 700 : 400,
                    ...(isToday && {
                      color: 'primary.contrastText',
                      backgroundColor: 'primary.main',
                      borderRadius: '50%',
                      width: 20,
                      height: 20,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }),
                  }}
                >
                  {day.date()}
                </Typography>
                {dayMeetings.map(renderMeetingChip)}
              </Stack>
            )
          })}
        </Box>
      </Stack>

      <MeetingDetailsDialog
        meeting={selectedMeeting}
        onClose={() => setSelectedMeeting(null)}
        onDelete={removeMeeting}
        onSaveLink={saveLink}
        saving={updateMeeting.isPending}
      />
    </Stack>
  )
}
