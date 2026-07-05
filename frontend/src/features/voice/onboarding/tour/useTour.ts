import { useCallback, useState } from 'react'
import type { TourStep } from './tourTypes'

/**
 * Контроллер spotlight-тура (ТП-118): текущий шаг, переходы, старт/стоп.
 * Продвижение бывает ручным (кнопка «Далее») и программным (`next()` из внешнего
 * события — например, после голосовой команды в практике, волна 4). Логика
 * навигации чистая и покрыта тестами через renderHook.
 */
export type UseTourResult = {
  active: boolean
  index: number
  step: TourStep | null
  isFirst: boolean
  isLast: boolean
  total: number
  start: (fromIndex?: number) => void
  next: () => void
  prev: () => void
  skip: () => void
  stop: () => void
}

export function useTour(
  steps: TourStep[],
  opts: { onFinish?: () => void; onSkip?: () => void } = {},
): UseTourResult {
  const [active, setActive] = useState(false)
  const [index, setIndex] = useState(0)

  const total = steps.length
  const clamp = (i: number) => Math.max(0, Math.min(i, total - 1))

  const start = useCallback(
    (fromIndex = 0) => {
      if (total === 0) return
      setIndex(clamp(fromIndex))
      setActive(true)
    },
    // clamp зависит только от total
    [total],
  )

  const stop = useCallback(() => setActive(false), [])

  const skip = useCallback(() => {
    setActive(false)
    opts.onSkip?.()
  }, [opts])

  const next = useCallback(() => {
    setIndex((i) => {
      if (i >= total - 1) {
        // последний шаг → завершение
        setActive(false)
        opts.onFinish?.()
        return i
      }
      return i + 1
    })
  }, [total, opts])

  const prev = useCallback(() => {
    setIndex((i) => Math.max(0, i - 1))
  }, [])

  return {
    active,
    index,
    step: active ? (steps[index] ?? null) : null,
    isFirst: index === 0,
    isLast: index === total - 1,
    total,
    start,
    next,
    prev,
    skip,
    stop,
  }
}
