import { useEffect, useState } from 'react'
// ТП-172: router.navigate вместо useNavigate — единый паттерн навигации из
// диалогов (класс TD-015: хук требует Router-контекст, singleton — нет).
import { router } from '@/application/router'
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import VideocamOutlinedIcon from '@mui/icons-material/VideocamOutlined'
import type { MeetingDto } from '@/shared/api/endpoint/meetingsApi'
import { useCreateMeetRoom } from '@/features/meet/useCreateMeetRoom'
import { buildMeetUrl, parseMeetToken } from '@/features/meet/meetLink'
import { notify } from '@/shared/ui/notify'

const LINK_PATTERN = /^https?:\/\/.+/

type Props = {
  meeting: MeetingDto | null
  projectId: string
  onClose: () => void
  onDelete: (meetingId: string) => void
  onSaveLink: (meeting: MeetingDto, link: string) => void
  saving?: boolean
}

function formatRange(meeting: MeetingDto): string {
  const start = new Date(meeting.startAt)
  const date = start.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  const time = start.toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  })
  if (!meeting.endAt) return `${date}, ${time}`
  const end = new Date(meeting.endAt).toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  })
  return `${date}, ${time} – ${end}`
}

export function MeetingDetailsDialog({
  meeting,
  projectId,
  onClose,
  onDelete,
  onSaveLink,
  saving,
}: Props) {
  const [link, setLink] = useState('')
  const createMeetRoom = useCreateMeetRoom(projectId)

  useEffect(() => {
    setLink(meeting?.link ?? '')
  }, [meeting])

  if (!meeting) return null

  const trimmed = link.trim()
  const linkChanged = trimmed !== (meeting.link ?? '')
  const linkValid = trimmed.length === 0 || LINK_PATTERN.test(trimmed)
  const meetToken = parseMeetToken(meeting.link)

  // M5 (ТП-165): видеоссылку WorkTask можно добавить и к существующей записи —
  // комната привязывается к встрече (идемпотентно), ссылка в то же поле link.
  const generateMeetLink = async () => {
    try {
      const room = await createMeetRoom.mutateAsync({ meetingId: meeting.id })
      onSaveLink(meeting, buildMeetUrl(room.token))
    } catch {
      notify.error('Не удалось создать видеовстречу — попробуйте ещё раз')
    }
  }

  // Своя встреча открывается внутри приложения; внешняя — новой вкладкой.
  const join = () => {
    if (meetToken) {
      onClose()
      void router.navigate({ to: '/meet/$token', params: { token: meetToken } })
      return
    }
    window.open(meeting.link!, '_blank', 'noopener,noreferrer')
  }

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle
        sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
      >
        {meeting.title}
        <IconButton
          size="small"
          aria-label="Удалить встречу"
          onClick={() => onDelete(meeting.id)}
        >
          <DeleteOutlineIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Stack gap={1.5}>
          <Typography color="text.secondary">{formatRange(meeting)}</Typography>
          {meeting.description && (
            <Typography whiteSpace="pre-wrap">{meeting.description}</Typography>
          )}
          {meeting.creatorName && (
            <Typography variant="body2" color="text.secondary">
              Организатор: {meeting.creatorName}
            </Typography>
          )}
          {meeting.participants.length > 0 && (
            <Typography variant="body2" color="text.secondary">
              Участники: {meeting.participants.map((p) => p.displayName).join(', ')}
            </Typography>
          )}
          {!meeting.link && (
            <Stack direction="row">
              <Button
                variant="outlined"
                startIcon={<VideocamOutlinedIcon />}
                disabled={createMeetRoom.isPending || saving}
                onClick={() => void generateMeetLink()}
              >
                Создать видеовстречу WorkTask
              </Button>
            </Stack>
          )}
          <Stack direction="row" gap={1} alignItems="flex-start">
            <TextField
              label="Ссылка на встречу"
              size="small"
              fullWidth
              value={link}
              onChange={(e) => setLink(e.target.value)}
              error={!linkValid}
              helperText={
                !linkValid
                  ? 'Ссылка должна начинаться с http:// или https://'
                  : meetToken
                    ? 'Видеовстреча WorkTask — откроется внутри приложения'
                    : undefined
              }
            />
            {linkChanged && (
              <Button
                variant="outlined"
                disabled={!linkValid || saving}
                onClick={() => onSaveLink(meeting, trimmed)}
              >
                Сохранить
              </Button>
            )}
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions>
        {meeting.link && (
          <Button
            variant="contained"
            startIcon={<VideocamOutlinedIcon />}
            onClick={join}
          >
            Подключиться
          </Button>
        )}
        <Button onClick={onClose}>Закрыть</Button>
      </DialogActions>
    </Dialog>
  )
}
