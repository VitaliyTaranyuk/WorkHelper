import { create } from 'zustand'

/**
 * Журнал голосовых действий сессии (ТП-103 / X2) — «журнал действий» из ТЗ.
 * Хранит последние выполненные команды с сообщением и (если поддерживается)
 * функцией отката. In-memory на сессию (Zustand, как остальной клиентский стейт).
 */
export type JournalEntry = {
  id: string
  at: number
  message: string
  taskCode?: string
  undo?: () => Promise<void>
  undone?: boolean
}

type JournalState = {
  entries: JournalEntry[]
  add: (entry: Omit<JournalEntry, 'id' | 'at'>) => void
  markUndone: (id: string) => void
  clear: () => void
}

const MAX_ENTRIES = 25

let seq = 0
function nextId(): string {
  seq += 1
  return `${Date.now()}-${seq}`
}

export const useVoiceJournal = create<JournalState>((set) => ({
  entries: [],
  add: (entry) =>
    set((state) => ({
      entries: [
        { ...entry, id: nextId(), at: Date.now() },
        ...state.entries,
      ].slice(0, MAX_ENTRIES),
    })),
  markUndone: (id) =>
    set((state) => ({
      entries: state.entries.map((e) =>
        e.id === id ? { ...e, undone: true, undo: undefined } : e,
      ),
    })),
  clear: () => set({ entries: [] }),
}))
