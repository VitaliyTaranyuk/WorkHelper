import { create } from 'zustand'

interface BoardEditModeState {
  editMode: boolean
  /** Есть несохранённые изменения конфигурации доски (порядок/видимость колонок). */
  isDirty: boolean
  toggle: () => void
  setEditMode: (value: boolean) => void
  setDirty: (value: boolean) => void
}

export const useBoardEditModeStore = create<BoardEditModeState>((set) => ({
  editMode: false,
  isDirty: false,
  toggle: () => set((state) => ({ editMode: !state.editMode })),
  setEditMode: (value) => set({ editMode: value }),
  setDirty: (value) => set({ isDirty: value }),
}))
