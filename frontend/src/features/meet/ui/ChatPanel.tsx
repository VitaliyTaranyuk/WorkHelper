import { useEffect, useRef, useState } from 'react'
import {
  Drawer,
  IconButton,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import SendIcon from '@mui/icons-material/Send'
import type { MeetChatMessage } from '../core/types'

type Props = {
  open: boolean
  onClose: () => void
  chat: MeetChatMessage[]
  selfSessionId: string | null
  onSend: (text: string) => void
}

function formatTime(at: number): string {
  return new Date(at).toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Чат встречи (M4): эфемерный — живёт, пока идёт встреча (§6 ADR, канон
 * Meet/Zoom). Автопрокрутка к новому сообщению, отправка по Enter.
 */
export function ChatPanel({ open, onClose, chat, selfSessionId, onSend }: Props) {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const [draft, setDraft] = useState('')
  const listEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) listEndRef.current?.scrollIntoView({ block: 'end' })
  }, [chat.length, open])

  const submit = () => {
    const text = draft.trim()
    if (!text) return
    onSend(text)
    setDraft('')
  }

  return (
    <Drawer
      anchor={isMobile ? 'bottom' : 'right'}
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: isMobile ? '100%' : 340,
          maxHeight: isMobile ? '70dvh' : undefined,
          backgroundColor: 'var(--wt-surface)',
          display: 'flex',
        },
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ px: 2, py: 1.5, flexShrink: 0 }}
      >
        <Typography variant="subtitle1" fontWeight={600}>
          Чат встречи
        </Typography>
        <IconButton size="small" aria-label="Закрыть чат" onClick={onClose}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Stack>

      <Stack sx={{ flex: 1, overflowY: 'auto', px: 2, gap: 1.25, minHeight: 120 }}>
        {chat.length === 0 && (
          <Typography variant="body2" color="text.secondary" textAlign="center" mt={2}>
            Сообщения видны только участникам и живут до конца встречи
          </Typography>
        )}
        {chat.map((message, index) => {
          const isSelf = message.sessionId === selfSessionId
          return (
            <Stack key={`${message.at}-${index}`} alignItems={isSelf ? 'flex-end' : 'flex-start'}>
              <Typography variant="caption" color="text.secondary">
                {isSelf ? 'Вы' : message.name} · {formatTime(message.at)}
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  px: 1.25,
                  py: 0.75,
                  borderRadius: 2,
                  maxWidth: '85%',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  backgroundColor: isSelf ? 'var(--wt-accent-soft)' : 'var(--wt-surface-muted)',
                }}
              >
                {message.text}
              </Typography>
            </Stack>
          )
        })}
        <div ref={listEndRef} />
      </Stack>

      <Stack direction="row" gap={1} sx={{ p: 2, flexShrink: 0 }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Сообщение…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              submit()
            }
          }}
          multiline
          maxRows={4}
          inputProps={{ maxLength: 2000, 'aria-label': 'Сообщение в чат встречи' }}
        />
        <IconButton
          color="primary"
          aria-label="Отправить сообщение"
          onClick={submit}
          disabled={!draft.trim()}
        >
          <SendIcon />
        </IconButton>
      </Stack>
    </Drawer>
  )
}
