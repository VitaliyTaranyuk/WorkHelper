import { useEffect } from 'react'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import CircularProgress from '@mui/material/CircularProgress'
import MicNoneOutlinedIcon from '@mui/icons-material/MicNoneOutlined'
import StopCircleOutlinedIcon from '@mui/icons-material/StopCircleOutlined'
import { notify as toast } from '@/shared/ui/notify'
import { useVoiceInput } from './useVoiceInput'
import type { VoiceField } from './core/intentAnalyzer'

type Props = {
  /**
   * Вызывается с надиктованным (отформатированным) текстом после записи.
   *
   * ТП-212: вызовов может быть два — сначала мгновенный локальный результат,
   * затем улучшенный, с `replaces` = ранее вставленный текст. Обработчик обязан
   * заменять только его и только если он ещё в поле (см. `applyDictation`).
   */
  onText: (text: string, replaces?: string) => void
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
    handlers: {
      onFieldText: (_field, text, replaces) => onText(text, replaces),
    },
    onEmpty: () => toast.error('Ничего не удалось расслышать — попробуйте ещё раз'),
  })
  const listening = speech.status === 'listening'
  // ТП-212: текст уже в поле, идёт лишь фоновое улучшение — кнопка остаётся
  // рабочей, индикатор только сообщает о фоновой работе (ТП-208 блокировал её).
  const processing = speech.enhancing

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
          : processing
            ? 'Текст уже в поле — улучшаем формулировку…'
            : `Надиктовать ${targetLabel} голосом`
      }
    >
      <span>
        <IconButton
          size="small"
          aria-label={listening ? 'Закончить диктовку' : 'Надиктовать голосом'}
          onClick={() => (listening ? speech.stop() : speech.start())}
          sx={listening ? { color: 'error.main' } : undefined}
        >
          {listening ? (
            <StopCircleOutlinedIcon fontSize="small" />
          ) : processing ? (
            <CircularProgress size={16} thickness={5} />
          ) : (
            <MicNoneOutlinedIcon fontSize="small" />
          )}
        </IconButton>
      </span>
    </Tooltip>
  )
}
