import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Button,
  CircularProgress,
  IconButton,
  Popover,
  Stack,
  Typography,
} from '@mui/material'
import MicNoneOutlinedIcon from '@mui/icons-material/MicNoneOutlined'
import MicIcon from '@mui/icons-material/Mic'
import { keyframes } from '@emotion/react'
import styled from '@emotion/styled'
import { useNavigate } from '@tanstack/react-router'
import { useProjectData } from '@/features/project/query/useProjectData'
import { useSprintsInfoQuery } from '@/features/sprint/query/useSprintsInfoQuery'
import { useCreateTask } from '@/features/task/mutation/useCreateTask'
import { useSpeechRecognition } from './useSpeechRecognition'
import {
  formatHotkey,
  hotkeyFromEvent,
  useHotkeySetting,
  useVoiceHotkey,
} from './useVoiceHotkey'
import {
  dispatchTranscript,
  getRegisteredCommands,
  registerVoiceCommand,
  UnrecognizedCommandError,
} from './commandRegistry'
import { createTaskCommand } from './commands/createTaskCommand'
import type { VoiceCommandContext, VoiceCommandResult } from './types'

// Регистрация доступных голосовых команд. Новая команда — ещё одна строка,
// существующий код подсистемы не меняется.
registerVoiceCommand(createTaskCommand)

const pulse = keyframes`
  0% { box-shadow: 0 0 0 0 rgba(211, 47, 47, 0.5); }
  70% { box-shadow: 0 0 0 10px rgba(211, 47, 47, 0); }
  100% { box-shadow: 0 0 0 0 rgba(211, 47, 47, 0); }
`

// styled вместо интерполяции keyframes в sx-строку: emotion гарантированно
// инжектит @keyframes только внутри собственного css-контекста (ТП-57 —
// пульсация записи не работала).
const PulsingMicButton = styled(IconButton)`
  color: #d32f2f;
  border-radius: 50%;
  animation: ${pulse} 1.6s infinite;
`

type Phase =
  | { kind: 'idle' }
  | { kind: 'listening' }
  | { kind: 'processing' }
  | { kind: 'success'; result: VoiceCommandResult }
  | { kind: 'failure'; message: string; transcript?: string }

/**
 * Голосовое управление (ТП-22): кнопка-микрофон в шапке + панель состояния.
 * Активация — кликом или настраиваемой горячей клавишей. Речь → текст
 * (Web Speech API, ru-RU) → реестр команд → действие. MVP-команда —
 * создание задачи.
 */
export function VoiceControl() {
  const anchorRef = useRef<HTMLButtonElement | null>(null)
  const [open, setOpen] = useState(false)
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' })
  const [hotkey, setHotkey] = useHotkeySetting()
  const [capturingHotkey, setCapturingHotkey] = useState(false)

  const navigate = useNavigate()
  const { activeProject } = useProjectData()
  const { data: sprints } = useSprintsInfoQuery({ projectId: activeProject?.id })
  const createTask = useCreateTask()

  const buildContext = useCallback((): VoiceCommandContext | null => {
    const defaultSprintId = (sprints ?? []).find((s) => s.isDefault)?.id
    if (!activeProject || !defaultSprintId) return null
    return {
      projectId: activeProject.id,
      defaultSprintId,
      createTask: async (dto) => {
        const r = await createTask.mutateAsync(dto)
        return { id: r.data.id, code: r.data.code }
      },
      // Пути приходят от будущих команд строками; router принимает их в рантайме.
      navigate: (to) => navigate({ to: to as '/' }),
    }
  }, [activeProject, sprints, createTask, navigate])

  const handleFinish = useCallback(
    async (transcript: string) => {
      if (!transcript.trim()) {
        setPhase({
          kind: 'failure',
          message: 'Ничего не удалось расслышать — попробуйте ещё раз',
        })
        return
      }
      setPhase({ kind: 'processing' })
      const ctx = buildContext()
      if (!ctx) {
        setPhase({ kind: 'failure', message: 'Проект ещё не загружен — попробуйте ещё раз' })
        return
      }
      try {
        const result = await dispatchTranscript(transcript, ctx)
        setPhase({ kind: 'success', result })
      } catch (err) {
        const message =
          err instanceof UnrecognizedCommandError
            ? 'Команда не распознана. Доступно: ' +
              getRegisteredCommands()
                .map((c) => c.hint)
                .join('; ')
            : err instanceof Error
              ? err.message
              : 'Не удалось выполнить команду'
        setPhase({ kind: 'failure', message, transcript })
      }
    },
    [buildContext],
  )

  const speech = useSpeechRecognition({ onFinish: handleFinish })

  const startListening = useCallback(() => {
    if (!speech.supported) return
    setOpen(true)
    setPhase({ kind: 'listening' })
    speech.start()
  }, [speech])

  const stopListening = useCallback(() => {
    speech.stop()
  }, [speech])

  const cancelAll = useCallback(() => {
    speech.cancel()
    setOpen(false)
    setPhase({ kind: 'idle' })
    setCapturingHotkey(false)
  }, [speech])

  // Горячая клавиша: idle → старт записи, во время записи → завершение.
  const hotkeyAction = useCallback(() => {
    if (phase.kind === 'listening') stopListening()
    else if (phase.kind !== 'processing') startListening()
  }, [phase.kind, startListening, stopListening])
  useVoiceHotkey(hotkey, hotkeyAction)

  // Ошибка распознавания (нет доступа к микрофону и т.п.) — в состояние
  // «Не получилось» с кнопкой «Повторить».
  useEffect(() => {
    if (speech.status === 'error' && speech.error && phase.kind === 'listening') {
      setPhase({ kind: 'failure', message: speech.error })
    }
  }, [speech.status, speech.error, phase.kind])

  // Escape — отмена записи (стандарт голосовых интерфейсов).
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cancelAll()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, cancelAll])

  // Захват новой горячей клавиши.
  useEffect(() => {
    if (!capturingHotkey) return
    const onKey = (e: KeyboardEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (e.key === 'Escape') {
        setCapturingHotkey(false)
        return
      }
      const next = hotkeyFromEvent(e)
      if (next) {
        setHotkey(next)
        setCapturingHotkey(false)
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [capturingHotkey, setHotkey])

  const listening = speech.status === 'listening'
  const speechError = speech.status === 'error' ? speech.error : null
  const MicButtonComponent = listening ? PulsingMicButton : IconButton

  return (
    <>
      <MicButtonComponent
        ref={anchorRef}
        size="small"
        aria-label="Голосовое управление"
        title={
          speech.supported
            ? `Голосовое управление (${formatHotkey(hotkey)})`
            : 'Голосовое управление не поддерживается этим браузером'
        }
        disabled={!speech.supported}
        onClick={() => (listening ? stopListening() : startListening())}
      >
        {listening ? <MicIcon fontSize="small" /> : <MicNoneOutlinedIcon fontSize="small" />}
      </MicButtonComponent>

      <Popover
        open={open}
        anchorEl={anchorRef.current}
        onClose={() => {
          // Во время записи/обработки не закрываем случайным кликом мимо.
          if (phase.kind === 'success' || phase.kind === 'failure') cancelAll()
        }}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { width: 380, p: 2 } } }}
      >
        <Stack gap={1.5}>
          {phase.kind === 'listening' && (
            <>
              <Stack direction="row" alignItems="center" gap={1}>
                <MicIcon color="error" fontSize="small" />
                <Typography variant="subtitle2">
                  Слушаю… говорите
                </Typography>
              </Stack>
              <Typography
                variant="body2"
                sx={{ minHeight: 48, whiteSpace: 'pre-wrap' }}
                color={speech.transcript || speech.interim ? 'text.primary' : 'text.secondary'}
              >
                {speech.transcript}
                {speech.interim && (
                  <span style={{ opacity: 0.55 }}> {speech.interim}</span>
                )}
                {!speech.transcript && !speech.interim && (
                  <>Например: {getRegisteredCommands()[0]?.hint}</>
                )}
              </Typography>
              {speechError && (
                <Typography variant="caption" color="error">
                  {speechError}
                </Typography>
              )}
              <Stack direction="row" gap={1}>
                <Button size="small" variant="contained" onClick={stopListening}>
                  Готово
                </Button>
                <Button size="small" onClick={cancelAll}>
                  Отмена (Esc)
                </Button>
              </Stack>
            </>
          )}

          {phase.kind === 'processing' && (
            <Stack direction="row" alignItems="center" gap={1.5}>
              <CircularProgress size={18} />
              <Typography variant="body2">Выполняю команду…</Typography>
            </Stack>
          )}

          {phase.kind === 'success' && (
            <>
              <Typography variant="subtitle2" color="success.main">
                Готово
              </Typography>
              <Typography variant="body2">{phase.result.message}</Typography>
              <Stack direction="row" gap={1}>
                {phase.result.taskCode && (
                  <Button
                    size="small"
                    variant="contained"
                    onClick={() => {
                      const code = phase.result.taskCode!
                      cancelAll()
                      navigate({ to: '/task/$code', params: { code } })
                    }}
                  >
                    Открыть
                  </Button>
                )}
                <Button size="small" onClick={startListening}>
                  Новая команда
                </Button>
                <Button size="small" onClick={cancelAll}>
                  Закрыть
                </Button>
              </Stack>
            </>
          )}

          {phase.kind === 'failure' && (
            <>
              <Typography variant="subtitle2" color="error">
                Не получилось
              </Typography>
              <Typography variant="body2">{phase.message}</Typography>
              {phase.transcript && (
                <Typography variant="caption" color="text.secondary">
                  Распознано: «{phase.transcript}»
                </Typography>
              )}
              <Stack direction="row" gap={1}>
                <Button size="small" variant="contained" onClick={startListening}>
                  Повторить
                </Button>
                <Button size="small" onClick={cancelAll}>
                  Закрыть
                </Button>
              </Stack>
            </>
          )}

          {(speechError && phase.kind !== 'listening') && (
            <Typography variant="caption" color="error">
              {speechError}
            </Typography>
          )}

          <Typography variant="caption" color="text.secondary">
            Горячая клавиша:{' '}
            {capturingHotkey ? (
              <b>нажмите сочетание… (Esc — отмена)</b>
            ) : (
              <>
                <b>{formatHotkey(hotkey)}</b>{' '}
                <Button
                  size="small"
                  sx={{ minWidth: 0, p: 0, verticalAlign: 'baseline' }}
                  onClick={() => setCapturingHotkey(true)}
                >
                  изменить
                </Button>
              </>
            )}
          </Typography>
        </Stack>
      </Popover>
    </>
  )
}
