import { useEffect, useRef, useState } from 'react'

const POLL_MS = 250
const RMS_THRESHOLD = 0.04

/**
 * Подсветка говорящего: RMS-анализ аудиодорожек (Web Audio) с опросом 4 раза
 * в секунду — достаточно для рамки на плитке и дёшево по CPU. AudioContext
 * создаётся лениво (после жеста «Присоединиться» браузер его не блокирует).
 */
export function useSpeakingDetection(
  streams: Map<string, MediaStream>,
  localStream: MediaStream | null,
  localMuted: boolean,
): Set<string> {
  const [speaking, setSpeaking] = useState<Set<string>>(() => new Set())
  const contextRef = useRef<AudioContext | null>(null)

  useEffect(() => {
    if (typeof AudioContext === 'undefined') return
    const entries: Array<{ id: string; stream: MediaStream }> = [
      ...(localStream ? [{ id: 'self', stream: localStream }] : []),
      ...[...streams.entries()].map(([id, stream]) => ({ id, stream })),
    ].filter((e) => e.stream.getAudioTracks().length > 0)
    if (entries.length === 0) {
      setSpeaking(new Set())
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
        if (id === 'self' && localMuted) continue
        analyser.getByteTimeDomainData(data)
        let sum = 0
        for (const value of data) {
          const centered = (value - 128) / 128
          sum += centered * centered
        }
        if (Math.sqrt(sum / data.length) > RMS_THRESHOLD) next.add(id)
      }
      setSpeaking((prev) => {
        if (prev.size === next.size && [...prev].every((id) => next.has(id)))
          return prev
        return next
      })
    }, POLL_MS)

    return () => {
      clearInterval(timer)
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

  return speaking
}
