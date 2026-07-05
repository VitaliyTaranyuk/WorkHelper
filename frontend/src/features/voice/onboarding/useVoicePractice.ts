import { useEffect, useRef } from 'react'
import { useVoiceJournal } from '../command/voiceJournal'
import type { UseTourResult } from './tour/useTour'
import type { PracticeStep } from './practiceSteps'

/**
 * Событийное продвижение практики (ТП-118): подписывается на журнал голосовых
 * действий и, когда появляется новая успешно выполненная команда, переводит
 * текущий шаг дальше — если шаг ждёт события и запись подходит под его условие.
 * Так пользователь двигается вперёд собственными действиями, а не кнопкой.
 *
 * Подписка одна и стабильная (tour держим в ref) — не пересоздаётся на каждый
 * рендер. При каждом входе в активный тур запоминаем текущую вершину журнала,
 * чтобы старые записи не листали шаги.
 */
export function useVoicePractice(tour: UseTourResult) {
  const tourRef = useRef(tour)
  tourRef.current = tour
  const lastIdRef = useRef<string | null>(null)

  // Точка отсчёта: при активации — текущая вершина журнала (или маркер пустоты).
  useEffect(() => {
    if (tour.active) {
      if (lastIdRef.current === null) {
        lastIdRef.current = useVoiceJournal.getState().entries[0]?.id ?? 'empty'
      }
    } else {
      lastIdRef.current = null
    }
  }, [tour.active])

  useEffect(() => {
    const unsub = useVoiceJournal.subscribe((state) => {
      const newest = state.entries[0]
      if (!newest || newest.id === lastIdRef.current) return
      lastIdRef.current = newest.id

      const t = tourRef.current
      if (!t.active) return
      const step = t.step as PracticeStep | null
      if (!step?.waitForEvent) return
      if (!step.expect || step.expect(newest)) {
        t.next()
      }
    })
    return unsub
  }, [])
}
