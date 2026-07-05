import { useEffect } from 'react'
import { useTour } from './tour/useTour'
import { TourHost } from './tour/TourHost'
import { useVoicePractice } from './useVoicePractice'
import { PRACTICE_STEPS } from './practiceSteps'

/**
 * Практика голосового помощника (ТП-118): проводит пользователя через реальные
 * сценарии. Строится на spotlight-туре (волна 3) и событийном продвижении по
 * журналу (useVoicePractice). Самодостаточный блок — монтируется поверх
 * приложения из общего онбординга (волна 5).
 */
export function VoicePractice({
  onDone,
  onSkip,
}: {
  onDone: () => void
  onSkip: () => void
}) {
  const tour = useTour(PRACTICE_STEPS, { onFinish: onDone, onSkip })
  useVoicePractice(tour)

  // Стартуем один раз при монтировании.
  useEffect(() => {
    tour.start()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return <TourHost tour={tour} />
}
