import { useEffect } from 'react'
import { notify as toast } from '@/shared/ui/notify'
import { useVoiceInput } from './useVoiceInput'
import { DictationIconButton } from './DictationIconButton'
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
 * Кнопка диктовки в короткое поле (ТП-58 → ТП-88): комментарий. Клик — запись,
 * повторный клик или тишина — окончание; распознанный текст проходит конвейер
 * (SpeechRecognition → IntentAnalyzer-заглушка → TextFormatter → Executor) и
 * уходит в onText одним куском.
 *
 * ТП-241: у описания диктовка другая — с живой расшифровкой и явной сессией
 * ({@link useLiveDictation}). Комментарий оставлен на этом простом варианте
 * осознанно: реплика короткая, отдельная панель расшифровки под ней была бы
 * тяжелее самой реплики.
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
    <DictationIconButton
      listening={listening}
      processing={processing}
      targetLabel={targetLabel}
      onClick={() => (listening ? speech.stop() : speech.start())}
    />
  )
}
