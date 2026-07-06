import { useEffect, useMemo, useState } from 'react'
import {
  Box,
  Button,
  Chip,
  IconButton,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import VideocamOutlinedIcon from '@mui/icons-material/VideocamOutlined'
import AddIcon from '@mui/icons-material/Add'
import dayjs, { type Dayjs } from 'dayjs'
import { useModal } from '@ebay/nice-modal-react'
import { useSettingsStore } from '@/features/settings/settingsStore'
import {
  useDeleteMeeting,
  useMeetings,
  useUpdateMeeting,
} from '@/features/meeting/useMeetings'
import type { MeetingDto } from '@/shared/api/endpoint/meetingsApi'
import { toBackendDateTime } from '@/features/meeting/dateTimeFormat'
import { MeetingDetailsDialog } from './MeetingDetailsDialog'
import { CreateMeetingModal } from '@/widget/modal/meeting/CreateMeetingModal'

type Props = { projectId: string; focusMeetingId?: string }

type CalendarView = 'week' | 'month'

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

/** Понедельник недели, в которую входит дата (dayjs .day(): 0 = воскресенье). */
function startOfWeek(date: Dayjs): Dayjs {
  return date.startOf('day').subtract((date.day() + 6) % 7, 'day')
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function CalendarPage({ projectId, focusMeetingId }: Props) {
  const { data: meetings } = useMeetings(projectId)
  const updateMeeting = useUpdateMeeting(projectId)
  const deleteMeeting = useDeleteMeeting(projectId)
  const createModal = useModal(CreateMeetingModal)

  // ТП-56: настройка календаря живёт в календаре — выбранный вид
  // запоминается (localStorage) и восстанавливается при следующем открытии.
  const savedView = useSettingsStore((s) => s.calendarView)
  const saveSettings = useSettingsStore((s) => s.set)
  const [view, setViewState] = useState<CalendarView>(savedView)
  const setView = (next: CalendarView) => {
    setViewState(next)
    saveSettings({ calendarView: next })
  }
  const [anchor, setAnchor] = useState<Dayjs>(dayjs())
  const [selectedMeeting, setSelectedMeeting] = useState<MeetingDto | null>(null)

  // ТП-67: создание встречи — модалка в общем стиле приложения (было —
  // постоянная боковая форма, выбивавшаяся из паттернов TMS/календарей).
  const openCreate = (date?: Dayjs) =>
    createModal.show({
      projectId,
      initialDate: date ? date.format('YYYY-MM-DD') : undefined,
    })

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
      onClick={(e) => {
        e.stopPropagation()
        setSelectedMeeting(m)
      }}
      sx={{
        justifyContent: 'flex-start',
        maxWidth: '100%',
        backgroundColor: 'var(--wt-accent-soft)',
        '&:hover': { backgroundColor: 'var(--wt-accent-soft-hover)' },
      }}
    />
  )

  return (
    <Stack gap={1.5} sx={{ p: 2, minWidth: 0 }}>
      {/* Панель управления: три зоны (сетка 1fr auto 1fr). Слева — навигация по
          периодам («Сегодня», стрелки, подпись периода). По центру — переключатель
          вида и первичное действие «Встреча» (ТП-116: раньше были прижаты к правому
          краю — неудобно; теперь по центру над сеткой). Пустая правая ячейка держит
          центр по-настоящему по середине. На узких экранах — одна колонка, обе
          группы центрируются и переносятся. */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr auto 1fr' },
          alignItems: 'center',
          columnGap: 1,
          rowGap: 1,
        }}
      >
        <Stack
          direction="row"
          alignItems="center"
          gap={1}
          flexWrap="wrap"
          sx={{ justifyContent: { xs: 'center', md: 'flex-start' } }}
        >
          <Button size="small" variant="outlined" onClick={() => setAnchor(dayjs())}>
            Сегодня
          </Button>
          <Stack direction="row" alignItems="center">
            <IconButton size="small" aria-label="Назад" onClick={() => shift(-1)}>
              <ChevronLeftIcon />
            </IconButton>
            <IconButton size="small" aria-label="Вперёд" onClick={() => shift(1)}>
              <ChevronRightIcon />
            </IconButton>
          </Stack>
          <Typography variant="h6">{periodLabel}</Typography>
        </Stack>

        <Stack
          direction="row"
          alignItems="center"
          gap={1}
          flexWrap="wrap"
          sx={{ justifyContent: 'center' }}
        >
          <ToggleButtonGroup
            size="small"
            exclusive
            value={view}
            onChange={(_, v: CalendarView | null) => v && setView(v)}
          >
            <ToggleButton value="week">Неделя</ToggleButton>
            <ToggleButton value="month">Месяц</ToggleButton>
          </ToggleButtonGroup>
          <Button
            variant="contained"
            size="small"
            startIcon={<AddIcon />}
            onClick={() => openCreate()}
          >
            Встреча
          </Button>
        </Stack>

        {/* Правая ячейка-балансир (только md+): держит центральную группу по центру. */}
        <Box sx={{ display: { xs: 'none', md: 'block' } }} />
      </Box>

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
              onClick={() => openCreate(day)}
              title="Нажмите, чтобы создать встречу"
              sx={{
                p: 0.75,
                minHeight: view === 'month' ? 96 : 320,
                backgroundColor: 'background.paper',
                opacity: outsideMonth ? 0.45 : 1,
                cursor: 'pointer',
                '&:hover': { backgroundColor: 'var(--wt-surface-hover)' },
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

      <MeetingDetailsDialog
        meeting={selectedMeeting}
        projectId={projectId}
        onClose={() => setSelectedMeeting(null)}
        onDelete={removeMeeting}
        onSaveLink={saveLink}
        saving={updateMeeting.isPending}
      />
    </Stack>
  )
}
