import { useEffect } from 'react'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import MicNoneOutlinedIcon from '@mui/icons-material/MicNoneOutlined'
import StopCircleOutlinedIcon from '@mui/icons-material/StopCircleOutlined'
import { notify as toast } from '@/shared/ui/notify'
import { useVoiceInput } from './useVoiceInput'
import type { VoiceField } from './core/intentAnalyzer'

type Props = {
  /** Вызывается с надиктованным (отформатированным) текстом после записи. */
  onText: (text: string) => void
  /** Поле-цель — определяет намерение диктовки (ТП-88) и подпись тултипа. */
  field?: VoiceField
  /** Подпись цели для тултипа, например «описание». */
  targetLabel?: string
}

/**
 * Кнопка диктовки в поле формы (ТП-58, переработана в ТП-88 под единый конвейер
 * голосового ввода). Клик — запись (иконка «стоп», подсветка), повторный клик
 * или тишина — окончание; распознанный текст проходит конвейер
 * (SpeechRecognition → IntentAnalyzer-заглушка → TextFormatter → Executor) и
 * уходит в onText. Намерение — DICTATE_FIELD (вставка в поле), задаётся `field`.
 */
export function DictationButton({
  onText,
  field = 'description',
  targetLabel = 'текст',
}: Props) {
  const speech = useVoiceInput({
    context: { intent: { type: 'DICTATE_FIELD', field } },
    handlers: { onFieldText: (_field, text) => onText(text) },
    onEmpty: () => toast.error('Ничего не удалось расслышать — попробуйте ещё раз'),
  })
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
