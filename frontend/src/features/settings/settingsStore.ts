import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * Клиентские настройки интерфейса (localStorage, zustand-persist).
 *
 * ТП-56: хранилище сужено до настроек, которые РЕАЛЬНО читаются кодом.
 * Прежние секции (уведомления, доска, тема, язык, плотность) были муляжами —
 * сохранялись, но ни на что не влияли; они удалены из UI и вынесены
 * в отдельные задачи (тёмная тема, серверные настройки уведомлений,
 * локализация). Старые ключи в localStorage безвредны — persist их игнорирует.
 */
export type UserSettings = {
  /** Вид календаря по умолчанию — запоминается при переключении (ТП-56, ТП-186). */
  calendarView: 'week' | 'month' | 'agenda'
}

const DEFAULTS: UserSettings = {
  calendarView: 'month',
}

type SettingsStore = UserSettings & {
  set: (partial: Partial<UserSettings>) => void
  reset: () => void
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      ...DEFAULTS,
      set: (partial) => set(partial),
      reset: () => set(DEFAULTS),
    }),
    { name: 'worktech-user-settings' },
  ),
)
