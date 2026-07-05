import { create } from 'zustand'

/**
 * Глобальный триггер запуска обучения (ТП-118). Позволяет открыть онбординг из
 * любого места (справочник в «Настройках», модалка-справка), не прокидывая
 * колбэки через дерево: VoiceLauncher (который держит поток обучения) слушает
 * счётчик и открывает флоу при его изменении.
 */
type OnboardingTriggerState = {
  nonce: number
  start: () => void
}

export const useOnboardingTrigger = create<OnboardingTriggerState>((set) => ({
  nonce: 0,
  start: () => set((s) => ({ nonce: s.nonce + 1 })),
}))
