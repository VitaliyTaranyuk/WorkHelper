/**
 * Одноразовая подсказка о голосовом помощнике в браузерах без Web Speech API
 * (ТП-139, находка F-014 аудита, решение владельца 06.07.2026).
 *
 * В неподдерживаемых браузерах (Firefox) кнопка микрофона скрыта — без
 * подсказки пользователь вообще не узнаёт о существовании голосового
 * управления. Показываем информационный тост ровно один раз на браузер
 * (persist в localStorage), дальше не напоминаем: постоянная мёртвая кнопка
 * или повторяющийся тост были бы навязчивее, чем польза от них.
 */

const STORAGE_KEY = 'voice.unsupportedHintShown'

export const VOICE_UNSUPPORTED_HINT =
  'Голосовое управление WorkTask доступно в Chrome, Edge и Safari — ' +
  'этот браузер не поддерживает распознавание речи.'

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>

/** Показывать ли подсказку (ещё не показывалась в этом браузере). */
export function shouldShowUnsupportedHint(
  storage: StorageLike = localStorage,
): boolean {
  try {
    return storage.getItem(STORAGE_KEY) === null
  } catch {
    // Недоступный storage (приватный режим со странностями) — не показываем,
    // чтобы не спамить тостом при каждом входе.
    return false
  }
}

/** Зафиксировать показ — больше не показывать. */
export function markUnsupportedHintShown(
  storage: StorageLike = localStorage,
): void {
  try {
    storage.setItem(STORAGE_KEY, new Date().toISOString())
  } catch {
    // ignore — в худшем случае подсказка покажется ещё раз
  }
}
