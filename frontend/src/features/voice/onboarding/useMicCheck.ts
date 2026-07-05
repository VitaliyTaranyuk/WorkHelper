import { useCallback, useEffect, useRef, useState } from 'react'
import {
  displayLevel,
  hasSignal,
  mapMicError,
  rmsFromTimeDomain,
  smooth,
  type MicPermission,
} from './micLevel'

/**
 * Проверка и калибровка микрофона (ТП-118). Через Web Audio API (getUserMedia +
 * AnalyserNode) измеряет уровень входящего сигнала — это то, чего Web Speech API
 * не даёт. Используется в мастере проверки оборудования и калибровки.
 *
 * Тяжёлая работа с браузерными API держится тонкой; вся математика уровня и
 * разбор ошибок — в чистых хелперах `micLevel.ts` (покрыты тестами).
 */

type AudioContextCtor = typeof AudioContext

function getAudioContextCtor(): AudioContextCtor | null {
  const w = window as unknown as {
    AudioContext?: AudioContextCtor
    webkitAudioContext?: AudioContextCtor
  }
  return w.AudioContext ?? w.webkitAudioContext ?? null
}

export type MicCheckState = {
  /** Доступны ли getUserMedia и AudioContext в этом браузере. */
  supported: boolean
  active: boolean
  permission: MicPermission
  /** Текущий сглаженный уровень 0..1. */
  level: number
  /** Максимальный уровень за сессию замера — для вердикта калибровки. */
  peak: number
  /** Пересекал ли сигнал порог (микрофон реально что-то слышит). */
  signalDetected: boolean
  error: string | null
}

const INITIAL: MicCheckState = {
  supported: false,
  active: false,
  permission: 'unknown',
  level: 0,
  peak: 0,
  signalDetected: false,
  error: null,
}

export function useMicCheck() {
  const supported =
    typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices?.getUserMedia &&
    getAudioContextCtor() !== null

  const [state, setState] = useState<MicCheckState>({ ...INITIAL, supported })

  const streamRef = useRef<MediaStream | null>(null)
  const ctxRef = useRef<AudioContext | null>(null)
  const rafRef = useRef<number | null>(null)
  const levelRef = useRef(0)

  const teardown = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    if (ctxRef.current && ctxRef.current.state !== 'closed') {
      void ctxRef.current.close().catch(() => {})
    }
    ctxRef.current = null
    levelRef.current = 0
  }, [])

  const stop = useCallback(() => {
    teardown()
    setState((s) => ({ ...s, active: false, level: 0 }))
  }, [teardown])

  const start = useCallback(async () => {
    if (!supported) {
      setState((s) => ({
        ...s,
        error:
          'Проверка микрофона недоступна в этом браузере — используйте ' +
          'Chrome, Edge или Safari.',
      }))
      return
    }
    teardown()
    setState((s) => ({
      ...s,
      active: true,
      error: null,
      level: 0,
      peak: 0,
      signalDetected: false,
    }))
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const Ctor = getAudioContextCtor()!
      const ctx = new Ctor()
      ctxRef.current = ctx
      const source = ctx.createMediaStreamSource(stream)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 2048
      source.connect(analyser)
      const buf = new Uint8Array(analyser.fftSize)

      setState((s) => ({ ...s, permission: 'granted' }))

      const tick = () => {
        analyser.getByteTimeDomainData(buf)
        const raw = displayLevel(rmsFromTimeDomain(buf))
        const next = smooth(levelRef.current, raw)
        levelRef.current = next
        setState((s) => ({
          ...s,
          level: next,
          peak: Math.max(s.peak, next),
          signalDetected: s.signalDetected || hasSignal(next),
        }))
        rafRef.current = requestAnimationFrame(tick)
      }
      rafRef.current = requestAnimationFrame(tick)
    } catch (err) {
      const mapped = mapMicError(err)
      teardown()
      setState((s) => ({
        ...s,
        active: false,
        permission: mapped.permission,
        error: mapped.message,
      }))
    }
  }, [supported, teardown])

  // Глушим микрофон при размонтировании — не держим устройство и индикатор.
  useEffect(() => teardown, [teardown])

  return { ...state, start, stop }
}
