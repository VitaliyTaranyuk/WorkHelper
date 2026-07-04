import { useEffect, useState } from 'react'
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

const LINK_PATTERN = /^https?:\/\/.+/

type Props = {
  meeting: MeetingDto | null
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
  onClose,
  onDelete,
  onSaveLink,
  saving,
}: Props) {
  const [link, setLink] = useState('')

  useEffect(() => {
    setLink(meeting?.link ?? '')
  }, [meeting])

  if (!meeting) return null

  const trimmed = link.trim()
  const linkChanged = trimmed !== (meeting.link ?? '')
  const linkValid = trimmed.length === 0 || LINK_PATTERN.test(trimmed)

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
            onClick={() =>
              window.open(meeting.link!, '_blank', 'noopener,noreferrer')
            }
          >
            Подключиться
          </Button>
        )}
        <Button onClick={onClose}>Закрыть</Button>
      </DialogActions>
    </Dialog>
  )
}
