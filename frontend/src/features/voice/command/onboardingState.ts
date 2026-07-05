/**
 * Флаг «первое знакомство пройдено» (ТП-107) — per-браузер (localStorage), как
 * хоткей. Онбординг показывается один раз при первом использовании голоса;
 * повторно доступен из справки.
 *
 * Имя файла отличается от компонента `VoiceOnboarding.tsx` не только регистром
 * (иначе на Windows/case-insensitive FS импорты конфликтуют).
 */
const KEY = 'voice.onboarding.seen'

export function isOnboardingSeen(): boolean {
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

export function markOnboardingSeen(): void {
  try {
    localStorage.setItem(KEY, '1')
  } catch {
    // приватный режим — не сохранится, но приложение работает
  }
}
