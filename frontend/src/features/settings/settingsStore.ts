import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type UserSettings = {
  // Notifications
  notifyMentions: boolean
  notifyDeadlines: boolean
  notifyMeetings: boolean
  reminderMinutes: number

  // Calendar
  calendarView: 'day' | 'week' | 'month'
  weekStart: 0 | 1
  workdayStart: string
  workdayEnd: string

  // Board
  hideEmptyCounters: boolean
  compactCards: boolean
  wipLimit: number | null

  // Theme
  theme: 'light' | 'dark' | 'system'

  // UI
  language: 'ru' | 'en'
  density: 'comfortable' | 'compact'
}

const DEFAULTS: UserSettings = {
  notifyMentions: true,
  notifyDeadlines: true,
  notifyMeetings: true,
  reminderMinutes: 15,
  calendarView: 'week',
  weekStart: 1,
  workdayStart: '09:00',
  workdayEnd: '18:00',
  hideEmptyCounters: true,
  compactCards: false,
  wipLimit: null,
  theme: 'light',
  language: 'ru',
  density: 'comfortable',
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
