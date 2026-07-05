import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Обёртка над Web Speech API (SpeechRecognition) для распознавания речи на
 * русском (ТП-22). Стандартная браузерная технология: без ключей, серверов и
 * передачи аудио через наш бэкенд. Поддержка: Chrome/Edge/Safari.
 *
 * Режимы завершения:
 *  - без `stopPhrase` (диктовка в поле, ТП-88): как раньше — тишина/`stop()`
 *    завершают распознавание, результат отдаётся в `onFinish`.
 *  - со `stopPhrase` (командный помощник, ТП-111): НЕПРЕРЫВНАЯ диктовка — на
 *    паузах распознавание перезапускается, накопленный текст НЕ теряется;
 *    завершение — по стоп-фразе (например «работаем») или кнопкой `stop()`.
 *    Анализ намерения выполняется ТОЛЬКО после завершения (один раз, весь текст).
 */

export const DEFAULT_STOP_PHRASE = 'работаем'

function normalizePhrase(s: string): string {
  return s
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[.,!?;:]/g, '')
    .trim()
}

/** Заканчивается ли текст стоп-фразой (по токенам, с учётом ё/е и пунктуации). */
export function endsWithStopPhrase(text: string, phrase: string): boolean {
  const tw = normalizePhrase(text).split(/\s+/).filter(Boolean)
  const pw = normalizePhrase(phrase).split(/\s+/).filter(Boolean)
  if (pw.length === 0 || tw.length < pw.length) return false
  const tail = tw.slice(tw.length - pw.length)
  return tail.every((w, i) => w === pw[i])
}

/** Убирает завершающую стоп-фразу из текста (сохраняя исходный регистр слов). */
export function stripStopPhrase(text: string, phrase: string): string {
  const words = text.trim().split(/\s+/).filter(Boolean)
  const pw = normalizePhrase(phrase).split(/\s+/).filter(Boolean)
  if (pw.length === 0 || words.length < pw.length) return text.trim()
  const tail = words.slice(words.length - pw.length).map(normalizePhrase)
  if (tail.every((w, i) => w === pw[i])) {
    return words.slice(0, words.length - pw.length).join(' ').trim()
  }
  return text.trim()
}

// Минимальные типы Web Speech API: в стандартном lib.dom их нет.
type SpeechRecognitionAlternativeLike = { transcript: string }
type SpeechRecognitionResultLike = {
  isFinal: boolean
  0: SpeechRecognitionAlternativeLike
}
type SpeechRecognitionEventLike = {
  resultIndex: number
  results: ArrayLike<SpeechRecognitionResultLike>
}
type SpeechRecognitionErrorEventLike = { error: string }

type SpeechRecognitionLike = {
  lang: string
  continuous: boolean
  interimResults: boolean
  start(): void
  stop(): void
  abort(): void
  onresult: ((e: SpeechRecognitionEventLike) => void) | null
  onerror: ((e: SpeechRecognitionErrorEventLike) => void) | null
  onend: (() => void) | null
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike

function getSpeechRecognition(): SpeechRecognitionCtor | null {
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor
    webkitSpeechRecognition?: SpeechRecognitionCtor
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export type SpeechStatus = 'idle' | 'listening' | 'error'

const ERROR_MESSAGES: Record<string, string> = {
  'not-allowed': 'Нет доступа к микрофону — разрешите его в настройках браузера',
  'service-not-allowed': 'Распознавание речи недоступно в этом браузере',
  'no-speech': 'Ничего не услышал — попробуйте ещё раз',
  'audio-capture': 'Микрофон не найден',
  // Chrome распознаёт речь через онлайн-сервис браузера — без доступа к нему
  // приходит network даже при работающем интернете (блокировки/файрвол).
  network:
    'Онлайн-сервис распознавания речи браузера недоступен — проверьте сеть (VPN/файрвол)',
  aborted: '',
}

export function useSpeechRecognition({
  onFinish,
  stopPhrase,
}: {
  /** Вызывается с полным текстом при завершении распознавания. */
  onFinish: (transcript: string) => void
  /** Стоп-фраза (ТП-111): включает непрерывный режим + завершение по фразе. */
  stopPhrase?: string
}) {
  const supported = getSpeechRecognition() !== null

  const [status, setStatus] = useState<SpeechStatus>('idle')
  const [transcript, setTranscript] = useState('')
  const [interim, setInterim] = useState('')
  const [error, setError] = useState<string | null>(null)

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  // Аккумулятор финального текста и флаги — вне React-состояния, чтобы
  // обработчики recognition видели актуальные значения.
  const finalRef = useRef('')
  const cancelledRef = useRef(false)
  const finishingRef = useRef(false)
  const onFinishRef = useRef(onFinish)
  onFinishRef.current = onFinish
  const stopPhraseRef = useRef(stopPhrase)
  stopPhraseRef.current = stopPhrase

  // Создаёт и запускает новый экземпляр распознавания (finalRef сохраняется —
  // нужен для перезапуска на паузе в непрерывном режиме).
  const spawn = useCallback(() => {
    const Ctor = getSpeechRecognition()
    if (!Ctor) return

    const recognition = new Ctor()
    recognition.lang = 'ru-RU'
    recognition.continuous = true
    recognition.interimResults = true

    recognition.onresult = (e) => {
      let interimText = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const result = e.results[i]
        const text = result[0]?.transcript ?? ''
        if (result.isFinal) {
          finalRef.current = `${finalRef.current} ${text}`.trim()
        } else {
          interimText += text
        }
      }
      // Стоп-фраза (ТП-111): проверяем накопленный + текущий interim.
      const phrase = stopPhraseRef.current
      if (phrase) {
        const combined = `${finalRef.current} ${interimText}`.trim()
        if (endsWithStopPhrase(combined, phrase)) {
          finishingRef.current = true
          finalRef.current = stripStopPhrase(finalRef.current, phrase)
          setTranscript(finalRef.current)
          setInterim('')
          recognitionRef.current?.stop()
          return
        }
      }
      setTranscript(finalRef.current)
      setInterim(interimText)
    }

    recognition.onerror = (e) => {
      if (e.error === 'aborted') return
      // no-speech при уже надиктованном или в непрерывном режиме — не ошибка
      // (onend перезапустит/отдаст накопленный результат).
      if (e.error === 'no-speech' && (finalRef.current || stopPhraseRef.current))
        return
      const message = ERROR_MESSAGES[e.error] ?? `Ошибка распознавания (${e.error})`
      cancelledRef.current = true
      setError(message)
      setStatus('error')
    }

    recognition.onend = () => {
      recognitionRef.current = null
      setInterim('')
      if (cancelledRef.current) return
      // Непрерывный режим: авто-остановка по тишине (не стоп/не фраза) →
      // перезапускаем, чтобы не потерять длинную диктовку.
      if (stopPhraseRef.current && !finishingRef.current) {
        try {
          spawn()
          return
        } catch {
          // не удалось перезапустить — завершаем накопленным
        }
      }
      setStatus('idle')
      onFinishRef.current(finalRef.current.trim())
    }

    recognitionRef.current = recognition
    setStatus('listening')
    recognition.start()
  }, [])

  const start = useCallback(() => {
    if (!getSpeechRecognition()) return
    if (recognitionRef.current) return
    finalRef.current = ''
    cancelledRef.current = false
    finishingRef.current = false
    setTranscript('')
    setInterim('')
    setError(null)
    spawn()
  }, [spawn])

  /** Явное окончание: onend отдаст накопленный результат (не перезапускает). */
  const stop = useCallback(() => {
    finishingRef.current = true
    recognitionRef.current?.stop()
  }, [])

  /** Отмена: результат отбрасывается. */
  const cancel = useCallback(() => {
    cancelledRef.current = true
    recognitionRef.current?.abort()
    recognitionRef.current = null
    setStatus('idle')
    setTranscript('')
    setInterim('')
    setError(null)
  }, [])

  // Размонтирование — глушим микрофон.
  useEffect(() => {
    return () => {
      cancelledRef.current = true
      recognitionRef.current?.abort()
    }
  }, [])

  return { supported, status, transcript, interim, error, start, stop, cancel }
}
