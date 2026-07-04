import Fab from '@mui/material/Fab'
import Tooltip from '@mui/material/Tooltip'
import MicNoneOutlinedIcon from '@mui/icons-material/MicNoneOutlined'
import StopCircleOutlinedIcon from '@mui/icons-material/StopCircleOutlined'
import { useVoiceCommandSession } from './useVoiceCommandSession'
import { useHotkeySetting, useVoiceHotkey, formatHotkey } from '../useVoiceHotkey'
import { VoiceOverlay } from './VoiceOverlay'

/**
 * Глобальная точка входа командного голоса (ТП-95 / X1). Плавающая кнопка
 * микрофона + горячая клавиша (по умолчанию Ctrl+Shift+M, раскладко-независимо —
 * ТП-57). Монтируется в DashboardLayout ВНУТРИ RouterProvider (нужен маршрут/
 * навигация; не через NiceModal — TD-015). В неподдерживающих браузерах скрыта.
 */
export function VoiceLauncher() {
  const session = useVoiceCommandSession()
  const [hotkey] = useHotkeySetting()
  useVoiceHotkey(hotkey, session.toggle)

  if (!session.supported) return null

  const listening = session.listening
  const label = listening
    ? 'Идёт запись — нажмите, чтобы закончить'
    : `Голосовая команда (${formatHotkey(hotkey)})`

  return (
    <>
      <Tooltip title={label} placement="left">
        <Fab
          color={listening ? 'error' : 'primary'}
          aria-label={label}
          onClick={session.toggle}
          disabled={!session.ready && !listening}
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: (t) => t.zIndex.snackbar - 1,
          }}
        >
          {listening ? <StopCircleOutlinedIcon /> : <MicNoneOutlinedIcon />}
        </Fab>
      </Tooltip>
      <VoiceOverlay session={session} />
    </>
  )
}
