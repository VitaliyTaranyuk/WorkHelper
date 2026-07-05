import { Spotlight } from './Spotlight'
import type { UseTourResult } from './useTour'

/**
 * Мост между контроллером тура (useTour) и визуалом (Spotlight): рендерит
 * подсветку активного шага. Контроллер остаётся снаружи — чтобы продвигать
 * тур можно было и кнопкой, и программно (по голосовому событию, волна 4).
 */
export function TourHost({ tour }: { tour: UseTourResult }) {
  if (!tour.active || !tour.step) return null
  return (
    <Spotlight
      step={tour.step}
      index={tour.index}
      total={tour.total}
      isFirst={tour.isFirst}
      isLast={tour.isLast}
      onNext={tour.next}
      onPrev={tour.prev}
      onSkip={tour.skip}
    />
  )
}
