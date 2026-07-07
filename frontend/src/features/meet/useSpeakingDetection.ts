import { useEffect, useRef, useState, type MutableRefObject } from 'react'

const POLL_MS = 100
const RMS_THRESHOLD = 0.04
/** Сглаживание уровня (EMA): убирает дрожание индикатора на фоновом шуме. */
const LEVEL_SMOOTHING = 0.6

export type SpeakingDetection = {
  /** Кто говорит сейчас ('self' | sessionId) — для рамки плитки. */
  speaking: Set<string>
  /**
   * Сглаженный уровень СВОЕГО микрофона 0..1 (ТП-177 ST-1). Ref, а не state:
   * значение меняется 10 раз/сек — индикатор читает его сам (MicLevelIndicator)
   * без перерендера всей сетки плиток. В mute всегда 0 (трек выдаёт тишину —
   * читать нечего, и это ожидаемое поведение, не баг).
   */
  selfLevelRef: MutableRefObject<number>
}

/**
 * Единый аудио-анализатор звонка (ТП-163 + ТП-177): RMS-анализ дорожек
 * (Web Audio) — подсветка говорящего на плитках и уровень собственного
 * микрофона в self-view. AudioContext создаётся лениво (после жеста
 * «Присоединиться» браузер его не блокирует).
 */
export function useSpeakingDetection(
  streams: Map<string, MediaStream>,
  localStream: MediaStream | null,
  localMuted: boolean,
): SpeakingDetection {
  const [speaking, setSpeaking] = useState<Set<string>>(() => new Set())
  const contextRef = useRef<AudioContext | null>(null)
  const selfLevelRef = useRef(0)

  useEffect(() => {
    if (typeof AudioContext === 'undefined') return
    const entries: Array<{ id: string; stream: MediaStream }> = [
      ...(localStream ? [{ id: 'self', stream: localStream }] : []),
      ...[...streams.entries()].map(([id, stream]) => ({ id, stream })),
    ].filter((e) => e.stream.getAudioTracks().length > 0)
    if (entries.length === 0) {
      setSpeaking(new Set())
      selfLevelRef.current = 0
      return
    }

    const context = contextRef.current ?? new AudioContext()
    contextRef.current = context
    void context.resume().catch(() => undefined)

    const analysers = entries.map(({ id, stream }) => {
      const source = context.createMediaStreamSource(stream)
      const analyser = context.createAnalyser()
      analyser.fftSize = 512
      source.connect(analyser)
      const data = new Uint8Array(analyser.fftSize)
      return { id, source, analyser, data }
    })

    const timer = setInterval(() => {
      const next = new Set<string>()
      for (const { id, analyser, data } of analysers) {
        if (id === 'self' && localMuted) {
          selfLevelRef.current = 0
          continue
        }
        analyser.getByteTimeDomainData(data)
        let sum = 0
        for (const value of data) {
          const centered = (value - 128) / 128
          sum += centered * centered
        }
        const rms = Math.sqrt(sum / data.length)
        if (id === 'self') {
          // Нормируем: обычная речь ~0.05–0.2 RMS → заметный отклик индикатора
          const level = Math.min(1, rms * 6)
          selfLevelRef.current =
            selfLevelRef.current * LEVEL_SMOOTHING + level * (1 - LEVEL_SMOOTHING)
        }
        if (rms > RMS_THRESHOLD) next.add(id)
      }
      setSpeaking((prev) => {
        if (prev.size === next.size && [...prev].every((id) => next.has(id)))
          return prev
        return next
      })
    }, POLL_MS)

    return () => {
      clearInterval(timer)
      selfLevelRef.current = 0
      for (const { source, analyser } of analysers) {
        source.disconnect()
        analyser.disconnect()
      }
    }
  }, [streams, localStream, localMuted])

  // Закрываем AudioContext только при размонтировании страницы звонка
  useEffect(
    () => () => {
      void contextRef.current?.close().catch(() => undefined)
    },
    [],
  )

  return { speaking, selfLevelRef }
}
