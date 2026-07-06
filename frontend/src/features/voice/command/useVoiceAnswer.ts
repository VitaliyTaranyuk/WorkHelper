import { useEffect, useRef } from 'react'

/**
 * Голосовой ответ на подтверждение команды (ТП-142): пока открыт вопрос
 * «Выполнить?», короткий слушатель ловит «да» / «отмена» — подтверждать
 * тапом по кнопке больше не обязательно (жалоба из обучения: «это же не
 * голосовой помощник»). Кнопки остаются равноправным способом ответа.
 *
 * Отдельный минимальный слушатель, а не полный useSpeechRecognition:
 * здесь не нужны накопление текста, стоп-фраза и перезапуски длинной
 * диктовки — только мгновенный матч короткой реплики. Ошибки глотаются
 * молча: голосовой ответ — удобство, fallback — кнопки.
 */

export type VoiceAnswer = 'yes' | 'no'

const YES_PHRASES = [
  'да',
  'ага',
  'угу',
  'конечно',
  'подтверждаю',
  'подтверди',
  'подтвердить',
  'выполняй',
  'выполни',
  'выполнить',
  'давай',
  'делай',
]

const NO_PHRASES = [
  'нет',
  'отмена',
  'отмени',
  'отменить',
  'не надо',
  'не нужно',
  'стоп',
]

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[.,!?;:()]/g, '')
    .trim()
}

function containsPhrase(tokens: string[], phrase: string): boolean {
  const pw = phrase.split(' ')
  for (let i = 0; i + pw.length <= tokens.length; i++) {
    if (pw.every((w, k) => tokens[i + k] === w)) return true
  }
  return false
}

/**
 * Распознаёт ответ в реплике. Отказ важнее согласия: «нет, не надо» не должно
 * сработать как «да» из-за случайного совпадения. null — реплика не про ответ.
 */
export function matchVoiceAnswer(text: string): VoiceAnswer | null {
  const tokens = normalize(text).split(/\s+/).filter(Boolean)
  if (tokens.length === 0) return null
  if (NO_PHRASES.some((p) => containsPhrase(tokens, p))) return 'no'
  if (YES_PHRASES.some((p) => containsPhrase(tokens, p))) return 'yes'
  return null
}

type RecognitionLike = {
  lang: string
  continuous: boolean
  interimResults: boolean
  start(): void
  abort(): void
  onresult:
    | ((e: {
        resultIndex: number
        results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>
      }) => void)
    | null
  onend: (() => void) | null
  onerror: ((e: { error: string }) => void) | null
}

function getRecognitionCtor(): (new () => RecognitionLike) | null {
  const w = window as unknown as {
    SpeechRecognition?: new () => RecognitionLike
    webkitSpeechRecognition?: new () => RecognitionLike
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

/** Пока `active` — слушает и отдаёт первый распознанный ответ в onAnswer. */
export function useVoiceAnswer({
  active,
  onAnswer,
}: {
  active: boolean
  onAnswer: (answer: VoiceAnswer) => void
}) {
  const onAnswerRef = useRef(onAnswer)
  onAnswerRef.current = onAnswer

  useEffect(() => {
    if (!active) return
    const Ctor = getRecognitionCtor()
    if (!Ctor) return

    let disposed = false
    let answered = false
    let recognition: RecognitionLike | null = null

    const spawn = () => {
      if (disposed || answered) return
      const r = new Ctor()
      r.lang = 'ru-RU'
      r.continuous = true
      r.interimResults = true
      r.onresult = (e) => {
        let text = ''
        for (let i = 0; i < e.results.length; i++) text += ` ${e.results[i][0]?.transcript ?? ''}`
        const answer = matchVoiceAnswer(text)
        if (answer && !answered) {
          answered = true
          r.abort()
          onAnswerRef.current(answer)
        }
      }
      // Пауза/сбой — тихо перезапускаемся, пока подтверждение открыто.
      r.onend = () => {
        recognition = null
        if (!disposed && !answered) spawn()
      }
      r.onerror = () => {
        // молча: кнопки — полноценный fallback
      }
      recognition = r
      try {
        r.start()
      } catch {
        // другой экземпляр распознавания ещё активен — кнопки остаются
      }
    }

    spawn()
    return () => {
      disposed = true
      recognition?.abort()
    }
  }, [active])
}
