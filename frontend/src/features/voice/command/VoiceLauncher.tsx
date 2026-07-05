import { useCallback, useEffect, useRef, useState } from 'react'
import Fab from '@mui/material/Fab'
import Tooltip from '@mui/material/Tooltip'
import MicNoneOutlinedIcon from '@mui/icons-material/MicNoneOutlined'
import StopCircleOutlinedIcon from '@mui/icons-material/StopCircleOutlined'
import HelpOutlineIcon from '@mui/icons-material/HelpOutline'
import { useVoiceCommandSession } from './useVoiceCommandSession'
import { useHotkeySetting, useVoiceHotkey, formatHotkey } from '../useVoiceHotkey'
import { VoiceOverlay } from './VoiceOverlay'
import { VoiceJournalButton } from './VoiceJournalButton'
import { VoiceHelpDialog } from './VoiceHelpDialog'
import { VoiceOnboardingFlow } from '../onboarding/VoiceOnboardingFlow'
import { getProgress, shouldOffer } from '../onboarding/onboardingProgress'
import { useOnboardingTrigger } from '../onboarding/onboardingTrigger'
import { TOUR_ANCHORS } from '../onboarding/anchors'

/**
 * Глобальная точка входа командного голоса (ТП-95 / X1). Кнопка микрофона +
 * горячая клавиша (Ctrl+Shift+M, раскладко-независимо — ТП-57). Монтируется в
 * DashboardLayout ВНУТРИ RouterProvider (TD-015). В неподдерживающих браузерах
 * скрыта. ТП-118: при первом использовании предлагается интерактивное обучение
 * (проверка микрофона + практика); кнопка «?» — справочник; обучение можно
 * запустить из справочника/настроек (глобальный триггер).
 */
export function VoiceLauncher() {
  const session = useVoiceCommandSession()
  const [hotkey] = useHotkeySetting()
  const [helpOpen, setHelpOpen] = useState(false)
  const [flowOpen, setFlowOpen] = useState(false)
  // Предлагаем обучение не чаще одного раза за сессию (не на каждый клик).
  const offeredRef = useRef(false)

  // Запуск обучения из справочника/настроек (ТП-118).
  const triggerNonce = useOnboardingTrigger((s) => s.nonce)
  useEffect(() => {
    if (triggerNonce > 0) setFlowOpen(true)
  }, [triggerNonce])

  // Первое использование → предложить обучение вместо записи (ТП-118).
  const handleMic = useCallback(() => {
    if (!session.listening && !offeredRef.current && shouldOffer(getProgress())) {
      offeredRef.current = true
      setFlowOpen(true)
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
      <Tooltip title="Справочник голосового помощника" placement="left">
        <Fab
          size="small"
          color="default"
          aria-label="Справочник голосового помощника"
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
          data-tour={TOUR_ANCHORS.voiceMic}
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

      <VoiceOnboardingFlow open={flowOpen} onExit={() => setFlowOpen(false)} />
      <VoiceHelpDialog
        open={helpOpen}
        hotkey={hotkey}
        onClose={() => setHelpOpen(false)}
        onStartOnboarding={() => {
          setHelpOpen(false)
          setFlowOpen(true)
        }}
      />
    </>
  )
}
