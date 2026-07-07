import { useEffect, useState, type MutableRefObject } from 'react'
import Stack from '@mui/material/Stack'
import MicNoneOutlinedIcon from '@mui/icons-material/MicNoneOutlined'
import { stage } from './stage'

const POLL_MS = 100
/** Высоты столбиков уровня (низкий/средний/высокий), px. */
const BARS = [4, 7, 10] as const
/** Порог активации каждого столбика по уровню 0..1. */
const BAR_THRESHOLDS = [0.06, 0.3, 0.6] as const

/**
 * Индикатор уровня собственного микрофона (ТП-177 ST-1, паттерн
 * Meet/Zoom: «вижу, что мой голос ловится»). Иконка микрофона + три
 * столбика, оживающие по громкости. Читает уровень из ref сам с частотой
 * анализатора — перерендеривается только этот маленький компонент,
 * сетка плиток не трогается.
 */
export function MicLevelIndicator({
  levelRef,
}: {
  levelRef: MutableRefObject<number>
}) {
  const [level, setLevel] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setLevel((prev) => {
        const next = levelRef.current
        return Math.abs(next - prev) < 0.02 ? prev : next
      })
    }, POLL_MS)
    return () => clearInterval(timer)
  }, [levelRef])

  return (
    <Stack
      direction="row"
      alignItems="center"
      gap={0.25}
      aria-label="Уровень микрофона"
      sx={{ minWidth: 0 }}
    >
      <MicNoneOutlinedIcon sx={{ fontSize: 14, color: stage.text }} />
      <Stack direction="row" alignItems="flex-end" gap="2px" sx={{ height: 10 }}>
        {BARS.map((height, i) => (
          <span
            key={height}
            style={{
              width: 3,
              height,
              borderRadius: 1,
              backgroundColor:
                level >= BAR_THRESHOLDS[i]
                  ? stage.speakingRing
                  : 'rgba(255, 255, 255, 0.25)',
              transition: 'background-color 80ms linear',
            }}
          />
        ))}
      </Stack>
    </Stack>
  )
}
