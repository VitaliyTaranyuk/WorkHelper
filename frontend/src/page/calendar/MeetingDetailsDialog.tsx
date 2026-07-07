import { useEffect, useState } from 'react'
// ТП-172: router.navigate вместо useNavigate — единый паттерн навигации из
// диалогов (класс TD-015: хук требует Router-контекст, singleton — нет).
import { router } from '@/application/router'
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import VideocamOutlinedIcon from '@mui/icons-material/VideocamOutlined'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import { Button } from '@/shared/ui/Button'
import { Spacer } from '@/shared/ui/Spacer'
import { TextField } from '@/shared/ui/mui/TextFileld'
import { FormCaption } from '@/shared/ui/components/FormCaption'
import { modalStyle } from '@/shared/ui/modalStyles'
import { confirmDialog } from '@/shared/ui/components/ConfirmDialog'
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

/**
 * Карточка встречи календаря. ТП-180: приведена к единому стилю модалок
 * приложения (modalStyle, заголовок, close-иконка, кнопки shared/ui,
 * FormCaption) и удаление — только через общий ConfirmDialog (деструктивное
 * действие без подтверждения было единственным таким местом, F-007/ТП-133);
 * карточка гарантированно закрывается ДО запуска удаления.
 */
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

  const remove = async () => {
    const ok = await confirmDialog({
      title: 'Удалить встречу',
      message: `Удалить встречу «${meeting.title}»? Действие необратимо; ссылка на видеовстречу перестанет работать.`,
      confirmLabel: 'Удалить',
      destructive: true,
    })
    if (!ok) return
    // Сначала закрываем карточку, затем запускаем удаление — карточка не
    // «живёт» после удаления даже при медленной сети (ТП-180).
    onClose()
    onDelete(meeting.id)
  }

  const copyLink = () => {
    void navigator.clipboard
      .writeText(meeting.link!)
      .then(() => notify.success('Ссылка скопирована'))
      .catch(() => notify.error('Не удалось скопировать ссылку'))
  }

  return (
    <Dialog
      open
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      slotProps={{ paper: { sx: modalStyle.modalContainer } }}
    >
      <DialogTitle sx={{ p: 0, pr: 5, fontSize: '24px', fontWeight: 500 }}>
        {meeting.title}
      </DialogTitle>
      <IconButton
        aria-label="close"
        onClick={onClose}
        sx={{ position: 'absolute', right: 32, top: 28 }}
        size="small"
      >
        <CloseIcon fontSize="small" />
      </IconButton>
      <DialogContent sx={{ ...modalStyle.modalContent, pb: 0 }}>
        <Stack gap={2}>
          <Typography color="text.secondary">{formatRange(meeting)}</Typography>
          {meeting.description && (
            <Typography whiteSpace="pre-wrap">{meeting.description}</Typography>
          )}
          {(meeting.creatorName || meeting.participants.length > 0) && (
            <Stack gap={0.5}>
              {meeting.creatorName && (
                <Typography variant="body2" color="text.secondary">
                  Организатор: {meeting.creatorName}
                </Typography>
              )}
              {meeting.participants.length > 0 && (
                <Typography variant="body2" color="text.secondary">
                  Участники:{' '}
                  {meeting.participants.map((p) => p.displayName).join(', ')}
                </Typography>
              )}
            </Stack>
          )}

          {!meeting.link && (
            <Stack direction="row">
              <Button
                variant="secondary"
                size="small"
                disabled={createMeetRoom.isPending || saving}
                onClick={() => void generateMeetLink()}
              >
                <VideocamOutlinedIcon fontSize="small" />
                Добавить видеовстречу
              </Button>
            </Stack>
          )}

          <Stack gap={0.5}>
            <FormCaption>Ссылка на встречу</FormCaption>
            <Stack direction="row" gap={1} alignItems="flex-start">
              <TextField
                size="small"
                fullWidth
                value={link}
                onChange={(e) => setLink(e.target.value)}
                error={!linkValid}
                helperText={
                  !linkValid
                    ? 'Ссылка должна начинаться с http:// или https://'
                    : meetToken
                      ? 'Видеовстреча WorkTask — откроется внутри приложения; очистите поле и сохраните, чтобы убрать встречу'
                      : undefined
                }
              />
              {meeting.link && !linkChanged && (
                <Tooltip title="Скопировать ссылку">
                  <IconButton aria-label="Скопировать ссылку" onClick={copyLink}>
                    <ContentCopyIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
              {linkChanged && (
                <Button
                  variant="secondary"
                  disabled={!linkValid || saving}
                  onClick={() => onSaveLink(meeting, trimmed)}
                >
                  Сохранить
                </Button>
              )}
            </Stack>
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 0, mt: '20px', gap: '12px' }}>
        {meeting.link && (
          <Button style={{ width: '50%' }} variant="primary" onClick={join}>
            <VideocamOutlinedIcon fontSize="small" />
            Подключиться
          </Button>
        )}
        <Button
          style={meeting.link ? undefined : { width: '50%' }}
          variant="secondary"
          onClick={() => void remove()}
        >
          <DeleteOutlineIcon fontSize="small" />
          Удалить
        </Button>
        <Spacer />
      </DialogActions>
    </Dialog>
  )
}
