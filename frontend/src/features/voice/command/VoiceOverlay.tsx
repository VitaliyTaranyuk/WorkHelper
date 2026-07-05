import { useEffect } from 'react'
import Paper from '@mui/material/Paper'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import CircularProgress from '@mui/material/CircularProgress'
import CloseIcon from '@mui/icons-material/Close'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import GraphicEqIcon from '@mui/icons-material/GraphicEq'
import { router } from '@/application/router'
import type { VoiceSession } from './useVoiceCommandSession'
import { voiceHelpItems } from './voiceHelp'

/**
 * Оверлей голосового командного режима (ТП-95 / X1). Компактная панель снизу по
 * центру, немодальная. Содержимое зависит от фазы: слушаю / распознаю /
 * подтверждение (для confirm/destructive) / результат / уточнение / ошибка.
 */
const AUTO_DISMISS_MS = 3500

export function VoiceOverlay({ session }: { session: VoiceSession }) {
  const { phase } = session

  // Успешный результат сам исчезает; уточнение/ошибку/подтверждение закрывает
  // пользователь.
  useEffect(() => {
    if (phase.t === 'message' && phase.kind === 'done') {
      const id = setTimeout(session.reset, AUTO_DISMISS_MS)
      return () => clearTimeout(id)
    }
  }, [phase, session])

  if (phase.t === 'idle') return null

  return (
    <Paper
      elevation={6}
      role="status"
      aria-live="polite"
      sx={{
        position: 'fixed',
        bottom: 96,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: (t) => t.zIndex.snackbar,
        width: 'min(92vw, 460px)',
        p: 2,
        borderRadius: 3,
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
      }}
    >
      {phase.t === 'listening' && (
        <ListeningView interim={session.interim} onStop={session.toggle} />
      )}

      {phase.t === 'processing' && (
        <Row>
          <CircularProgress size={18} />
          <Typography variant="body2">Распознаю команду…</Typography>
        </Row>
      )}

      {phase.t === 'confirm' && (
        <ConfirmView
          title={phase.title}
          summary={phase.summary}
          risky={phase.riskLevel === 'destructive'}
          onConfirm={session.confirm}
          onCancel={session.reset}
        />
      )}

      {phase.t === 'message' && (
        <MessageView
          kind={phase.kind}
          text={phase.text}
          taskCode={phase.taskCode}
          onRetry={session.toggle}
          onClose={session.reset}
        />
      )}
    </Paper>
  )
}

function Row({ children }: { children: React.ReactNode }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>{children}</Box>
  )
}

function ListeningView({
  interim,
  onStop,
}: {
  interim: string
  onStop: () => void
}) {
  return (
    <>
      <Row>
        <GraphicEqIcon color="error" />
        <Typography variant="subtitle2" sx={{ flexGrow: 1 }}>
          Слушаю…
        </Typography>
        <Button size="small" variant="outlined" color="error" onClick={onStop}>
          Стоп
        </Button>
      </Row>
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ minHeight: 20, fontStyle: interim ? 'normal' : 'italic' }}
      >
        {interim || 'Говорите свободно · скажите «Работаем», чтобы завершить'}
      </Typography>
    </>
  )
}

function ConfirmView({
  title,
  summary,
  risky,
  onConfirm,
  onCancel,
}: {
  title: string
  summary: string
  risky: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <>
      <Typography variant="subtitle2">{title}</Typography>
      <Typography variant="body2" color="text.secondary">
        {summary}
      </Typography>
      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', mt: 0.5 }}>
        <Button size="small" onClick={onCancel}>
          Отмена
        </Button>
        <Button
          size="small"
          variant="contained"
          color={risky ? 'error' : 'primary'}
          onClick={onConfirm}
        >
          Подтвердить
        </Button>
      </Box>
    </>
  )
}

function MessageView({
  kind,
  text,
  taskCode,
  onRetry,
  onClose,
}: {
  kind: 'done' | 'clarify' | 'error'
  text: string
  taskCode?: string
  onRetry: () => void
  onClose: () => void
}) {
  return (
    <>
      <Row>
        {kind === 'done' && <CheckCircleOutlineIcon color="success" />}
        <Typography variant="body2" sx={{ flexGrow: 1 }}>
          {text}
        </Typography>
        <IconButton size="small" aria-label="Закрыть" onClick={onClose}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Row>
      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
        {kind === 'done' && taskCode && (
          <Button
            size="small"
            onClick={() => {
              onClose()
              router.navigate({ to: '/task/$code', params: { code: taskCode } })
            }}
          >
            Открыть
          </Button>
        )}
        {kind === 'clarify' && (
          <Button size="small" onClick={onRetry}>
            Сказать снова
          </Button>
        )}
      </Box>
      {kind === 'clarify' && <VoiceHelpHint />}
    </>
  )
}

/** Встроенная подсказка «что можно сказать» (ТП-103) — из реестра команд. */
function VoiceHelpHint() {
  const items = voiceHelpItems().slice(0, 6)
  return (
    <Box sx={{ mt: 0.5 }}>
      <Typography variant="caption" color="text.secondary">
        Примеры команд:
      </Typography>
      <Box component="ul" sx={{ m: 0, pl: 2 }}>
        {items.map((it) => (
          <Typography key={it.title} component="li" variant="caption" color="text.secondary">
            {it.example}
          </Typography>
        ))}
      </Box>
    </Box>
  )
}
