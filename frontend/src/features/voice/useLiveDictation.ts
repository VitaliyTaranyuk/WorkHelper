import { useCallback, useEffect, useRef } from 'react'
import { notify as toast } from '@/shared/ui/notify'
import { useVoiceInput } from './useVoiceInput'
import type { VoiceField } from './core/intentAnalyzer'
import {
  clearActiveDictation,
  setActiveDictation,
} from './activeDictation'

/**
 * Сессия live-диктовки в поле (ТП-241).
 *
 * Отличие от кнопки ТП-88: там речь уходила в поле ОДНИМ куском в конце —
 * пользователь говорил в пустоту и не понимал, слышат его или нет. Здесь
 * распознанное видно по ходу речи (`liveFinal` + `liveInterim`), а в поле оно
 * попадает один раз — когда человек закончил сессию. Такое разделение выбрано
 * потому, что описание — обычная `textarea`: подсветить «ещё не окончательный»
 * фрагмент ВНУТРИ неё нечем, а без подсветки требование «понятно, что идёт
 * диктовка» не выполняется.
 *
 * Сессию заканчивает только человек: Enter (или кнопка, или отправка формы) —
 * вставить, Esc — отменить. Паузы на обдумывание диктовку больше не обрывают
 * (`keepAlive`), поэтому включён предохранитель: после
 * {@link SILENCE_LIMIT_MS} без единого распознанного слова сессия закрывается
 * сама — забытый включённый микрофон недопустим.
 */

/** Предохранитель от забытого микрофона: тишина дольше — сессия закрывается. */
export const SILENCE_LIMIT_MS = 60_000

export function useLiveDictation({
  field = 'description',
  onText,
}: {
  field?: VoiceField
  /**
   * Вставка в поле. Как и в ТП-212, вызовов может быть два: локальный результат
   * сразу и улучшенный следом, с `replaces` = ранее вставленный текст.
   */
  onText: (text: string, replaces?: string) => void
}) {
  const speech = useVoiceInput({
    context: { intent: { type: 'DICTATE_FIELD', field } },
    handlers: { onFieldText: (_field, text, replaces) => onText(text, replaces) },
    onEmpty: () => toast.error('Ничего не удалось расслышать — попробуйте ещё раз'),
    keepAlive: true,
  })

  const listening = speech.status === 'listening'
  const liveFinal = speech.transcript
  const liveInterim = speech.interim

  // Сессия управляется извне (кнопка «Создать», глобальный Enter) — держим
  // актуальные обработчики в ref, чтобы регистрация не пересоздавалась.
  const finishRef = useRef(speech.finish)
  finishRef.current = speech.finish
  const cancelRef = useRef(speech.cancel)
  cancelRef.current = speech.cancel

  const finish = useCallback(() => {
    finishRef.current()
  }, [])
  const cancel = useCallback(() => {
    cancelRef.current()
  }, [])

  // Регистрация идущей сессии: «Создать»/«Сохранить» завершают её перед тем,
  // как прочитать значения формы (иначе последняя фраза не доедет).
  useEffect(() => {
    if (!listening) return
    const finalize = () => finishRef.current()
    setActiveDictation(finalize)
    return () => clearActiveDictation(finalize)
  }, [listening])

  // Enter — вставить надиктованное как обычный текст (сессия закончена),
  // Esc — отменить. Перехват на фазе capture: Enter иначе уйдёт переводом
  // строки в textarea, а Esc закроет модалку вместе с несохранённой диктовкой.
  // Shift+Enter намеренно оставлен полю — перенос строки во время диктовки.
  useEffect(() => {
    if (!listening) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        e.stopPropagation()
        finishRef.current()
      } else if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        cancelRef.current()
      }
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [listening])

  // Предохранитель от забытого микрофона: таймер перезапускается на каждом
  // распознанном фрагменте, поэтому «тишина» здесь — именно тишина.
  useEffect(() => {
    if (!listening) return
    const timer = setTimeout(() => finishRef.current(), SILENCE_LIMIT_MS)
    return () => clearTimeout(timer)
  }, [listening, liveFinal, liveInterim])

  return {
    supported: speech.supported,
    listening,
    /** ТП-212: текст уже в поле, идёт фоновое улучшение формулировки. */
    enhancing: speech.enhancing,
    error: speech.error,
    status: speech.status,
    liveFinal,
    liveInterim,
    start: speech.start,
    finish,
    cancel,
  }
}
