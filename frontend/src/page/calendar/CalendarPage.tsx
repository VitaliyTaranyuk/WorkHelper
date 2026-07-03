import { useMemo, useState } from 'react'
import {
  Button,
  IconButton,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import { useProjectData } from '@/features/project/query/useProjectData'
import {
  useCreateMeeting,
  useDeleteMeeting,
  useMeetings,
} from '@/features/meeting/useMeetings'

type Props = { projectId: string }

function withSeconds(local: string): string {
  // datetime-local -> "yyyy-MM-ddTHH:mm" ; backend expects seconds
  return local.length === 16 ? `${local}:00` : local
}

export function CalendarPage({ projectId }: Props) {
  const { data: meetings } = useMeetings(projectId)
  const createMeeting = useCreateMeeting(projectId)
  const deleteMeeting = useDeleteMeeting(projectId)

  // Участники встречи выбираются из участников проекта: встречи привязаны
  // к проекту, а GET /users доступен только ADMIN/PROJECT_OWNER (участник
  // проекта получал 403 при открытии календаря).
  const { activeProject } = useProjectData()
  const users = activeProject?.users

  const [title, setTitle] = useState('')
  const [startAt, setStartAt] = useState('')
  const [endAt, setEndAt] = useState('')
  const [participantIds, setParticipantIds] = useState<string[]>([])

  const valid = title.trim().length > 0 && startAt.length > 0

  const grouped = useMemo(() => {
    // По дате/времени: ближайшие предстоящие встречи — вверху, прошедшие — ниже.
    const now = Date.now()
    const list = [...(meetings ?? [])]
    const upcoming = list
      .filter((m) => new Date(m.startAt).getTime() >= now)
      .sort((a, b) => +new Date(a.startAt) - +new Date(b.startAt))
    const past = list
      .filter((m) => new Date(m.startAt).getTime() < now)
      .sort((a, b) => +new Date(b.startAt) - +new Date(a.startAt))
    const ordered = [...upcoming, ...past]

    const map = new Map<string, typeof meetings>()
    for (const m of ordered) {
      const day = new Date(m.startAt).toLocaleDateString('ru-RU')
      if (!map.has(day)) map.set(day, [])
      map.get(day)!.push(m)
    }
    return [...map.entries()]
  }, [meetings])

  const submit = async () => {
    if (!valid) return
    await createMeeting.mutateAsync({
      title: title.trim(),
      startAt: withSeconds(startAt),
      endAt: endAt ? withSeconds(endAt) : undefined,
      participantIds,
    })
    setTitle('')
    setStartAt('')
    setEndAt('')
    setParticipantIds([])
  }

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
        <Button
          variant="contained"
          disabled={!valid || createMeeting.isPending}
          onClick={submit}
        >
          Создать встречу
        </Button>
      </Stack>

      <Stack gap={2} sx={{ flex: 1 }}>
        <Typography variant="h6">Календарь встреч</Typography>
        {grouped.length === 0 && (
          <Typography color="text.secondary">Встреч пока нет</Typography>
        )}
        {grouped.map(([day, dayMeetings]) => (
          <Stack key={day} gap={1}>
            <Typography variant="subtitle2" color="text.secondary">
              {day}
            </Typography>
            {(dayMeetings ?? []).map((m) => (
              <Stack
                key={m.id}
                direction="row"
                alignItems="center"
                gap={2}
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  backgroundColor: 'rgba(99,102,241,0.06)',
                }}
              >
                <Stack sx={{ minWidth: 110 }}>
                  <Typography variant="body2">
                    {new Date(m.startAt).toLocaleTimeString('ru-RU', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                    {m.endAt
                      ? ` – ${new Date(m.endAt).toLocaleTimeString('ru-RU', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}`
                      : ''}
                  </Typography>
                </Stack>
                <Stack sx={{ flex: 1 }}>
                  <Typography fontWeight={500}>{m.title}</Typography>
                  {m.participants.length > 0 && (
                    <Typography variant="caption" color="text.secondary">
                      {m.participants.map((p) => p.displayName).join(', ')}
                    </Typography>
                  )}
                </Stack>
                <IconButton
                  size="small"
                  aria-label="Удалить встречу"
                  onClick={() => deleteMeeting.mutate(m.id)}
                >
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </Stack>
            ))}
          </Stack>
        ))}
      </Stack>
    </Stack>
  )
}
