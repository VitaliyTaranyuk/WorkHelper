import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Обёртка над Web Speech API (SpeechRecognition) для диктовки на русском
 * (ТП-22). Технология выбрана как стандартная браузерная: без ключей,
 * серверов и передачи аудио через наш бэкенд. Поддержка: Chrome/Edge/Safari;
 * в неподдерживаемых браузерах хук отдаёт supported=false.
 *
 * Окончание диктовки: штатное определение тишины браузером (onend) либо
 * явное завершение пользователем (stop). Отмена — abort, результат
 * не обрабатывается.
 */

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
}: {
  /** Вызывается с полным текстом при штатном окончании диктовки. */
  onFinish: (transcript: string) => void
}) {
  const supported = getSpeechRecognition() !== null

  const [status, setStatus] = useState<SpeechStatus>('idle')
  const [transcript, setTranscript] = useState('')
  const [interim, setInterim] = useState('')
  const [error, setError] = useState<string | null>(null)

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  // Аккумулятор финального текста и флаг отмены — вне React-состояния,
  // чтобы обработчики recognition видели актуальные значения.
  const finalRef = useRef('')
  const cancelledRef = useRef(false)
  const onFinishRef = useRef(onFinish)
  onFinishRef.current = onFinish

  const start = useCallback(() => {
    const Ctor = getSpeechRecognition()
    if (!Ctor) return
    // Уже слушаем — повторный старт игнорируем.
    if (recognitionRef.current) return

    const recognition = new Ctor()
    recognition.lang = 'ru-RU'
    // continuous: пользователь может делать паузы между предложениями,
    // окончание — по стоп-кнопке или длинной тишине (onend браузера).
    recognition.continuous = true
    recognition.interimResults = true

    finalRef.current = ''
    cancelledRef.current = false
    setTranscript('')
    setInterim('')
    setError(null)

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
      setTranscript(finalRef.current)
      setInterim(interimText)
    }

    recognition.onerror = (e) => {
      const message = ERROR_MESSAGES[e.error] ?? `Ошибка распознавания (${e.error})`
      if (e.error === 'aborted') return // отмена пользователем — не ошибка
      // no-speech при уже надиктованном тексте не считаем ошибкой —
      // onend отдаст накопленный результат.
      if (e.error === 'no-speech' && finalRef.current) return
      cancelledRef.current = true
      setError(message)
      setStatus('error')
    }

    recognition.onend = () => {
      recognitionRef.current = null
      setInterim('')
      if (cancelledRef.current) return
      setStatus('idle')
      onFinishRef.current(finalRef.current.trim())
    }

    recognitionRef.current = recognition
    setStatus('listening')
    recognition.start()
  }, [])

  /** Явное окончание диктовки: onend отдаст результат. */
  const stop = useCallback(() => {
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
