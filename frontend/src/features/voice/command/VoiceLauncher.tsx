import { useCallback, useState } from 'react'
import Fab from '@mui/material/Fab'
import Tooltip from '@mui/material/Tooltip'
import MicNoneOutlinedIcon from '@mui/icons-material/MicNoneOutlined'
import StopCircleOutlinedIcon from '@mui/icons-material/StopCircleOutlined'
import HelpOutlineIcon from '@mui/icons-material/HelpOutline'
import { useVoiceCommandSession } from './useVoiceCommandSession'
import { useHotkeySetting, useVoiceHotkey, formatHotkey } from '../useVoiceHotkey'
import { VoiceOverlay } from './VoiceOverlay'
import { VoiceJournalButton } from './VoiceJournalButton'
import { VoiceOnboarding } from './VoiceOnboarding'
import { VoiceHelpDialog } from './VoiceHelpDialog'
import { isOnboardingSeen, markOnboardingSeen } from './onboardingState'

/**
 * Глобальная точка входа командного голоса (ТП-95 / X1). Кнопка микрофона +
 * горячая клавиша (Ctrl+Shift+M, раскладко-независимо — ТП-57). Монтируется в
 * DashboardLayout ВНУТРИ RouterProvider (TD-015). В неподдерживающих браузерах
 * скрыта. ТП-107: при первом использовании — обучение; кнопка «?» — справка.
 */
export function VoiceLauncher() {
  const session = useVoiceCommandSession()
  const [hotkey] = useHotkeySetting()
  const [helpOpen, setHelpOpen] = useState(false)
  const [onboardingOpen, setOnboardingOpen] = useState(false)

  // Первое использование → обучение вместо записи (ТП-107); дальше — обычный старт.
  const handleMic = useCallback(() => {
    if (!session.listening && !isOnboardingSeen()) {
      markOnboardingSeen()
      setOnboardingOpen(true)
      return
    }
    session.toggle()
  }, [session])

  useVoiceHotkey(hotkey, handleMic)

  if (!session.supported) return null

  const listening = session.listening
  const micLabel = listening
    ? 'Идёт запись — нажмите, чтобы закончить'
    : `Голосовая команда (${formatHotkey(hotkey)})`

  return (
    <>
      <Tooltip title="Возможности голосового помощника" placement="left">
        <Fab
          size="small"
          color="default"
          aria-label="Справка голосового помощника"
          onClick={() => setHelpOpen(true)}
          sx={{
            position: 'fixed',
            bottom: 30,
            right: 88,
            zIndex: (t) => t.zIndex.snackbar - 1,
          }}
        >
          <HelpOutlineIcon />
        </Fab>
      </Tooltip>

      <Tooltip title={micLabel} placement="left">
        <Fab
          color={listening ? 'error' : 'primary'}
          aria-label={micLabel}
          onClick={handleMic}
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

      <VoiceJournalButton />
      <VoiceOverlay session={session} />

      <VoiceOnboarding
        open={onboardingOpen}
        onClose={() => setOnboardingOpen(false)}
      />
      <VoiceHelpDialog
        open={helpOpen}
        hotkey={hotkey}
        onClose={() => setHelpOpen(false)}
        onStartOnboarding={() => {
          setHelpOpen(false)
          setOnboardingOpen(true)
        }}
      />
    </>
  )
}
