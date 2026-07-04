import { useCallback, useEffect } from 'react'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import MicNoneOutlinedIcon from '@mui/icons-material/MicNoneOutlined'
import StopCircleOutlinedIcon from '@mui/icons-material/StopCircleOutlined'
import { notify as toast } from '@/shared/ui/notify'
import { useSpeechRecognition } from './useSpeechRecognition'
import { capitalizeFirst, stripFillers } from './textUtils'

type Props = {
  /** Вызывается с надиктованным текстом после окончания записи. */
  onText: (text: string) => void
  /** Подпись цели для тултипа, например «описание». */
  targetLabel?: string
}

/**
 * Кнопка диктовки в поле формы (ТП-58): клик — запись (иконка «стоп»,
 * подсветка), повторный клик или тишина — окончание, распознанный текст
 * уходит в onText. Использует ту же подсистему распознавания, что и
 * голосовые команды (useSpeechRecognition, ru-RU); обработка текста
 * минимальная — регистр и удаление явных междометий.
 */
export function DictationButton({ onText, targetLabel = 'текст' }: Props) {
  const handleFinish = useCallback(
    (transcript: string) => {
      const text = capitalizeFirst(stripFillers(transcript))
      if (!text) {
        toast.error('Ничего не удалось расслышать — попробуйте ещё раз')
        return
      }
      onText(text)
    },
    [onText],
  )

  const speech = useSpeechRecognition({ onFinish: handleFinish })
  const listening = speech.status === 'listening'

  // Ошибки распознавания (нет доступа к микрофону и т.п.) — тостом.
  useEffect(() => {
    if (speech.status === 'error' && speech.error) toast.error(speech.error)
  }, [speech.status, speech.error])

  if (!speech.supported) return null

  return (
    <Tooltip
      title={
        listening
          ? 'Идёт запись — нажмите, чтобы закончить'
          : `Надиктовать ${targetLabel} голосом`
      }
    >
      <IconButton
        size="small"
        aria-label={listening ? 'Закончить диктовку' : 'Надиктовать голосом'}
        onClick={() => (listening ? speech.stop() : speech.start())}
        sx={listening ? { color: 'error.main' } : undefined}
      >
        {listening ? (
          <StopCircleOutlinedIcon fontSize="small" />
        ) : (
          <MicNoneOutlinedIcon fontSize="small" />
        )}
      </IconButton>
    </Tooltip>
  )
}
