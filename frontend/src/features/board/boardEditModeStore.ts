import { create } from 'zustand'

interface BoardEditModeState {
  editMode: boolean
  toggle: () => void
  setEditMode: (value: boolean) => void
}

export const useBoardEditModeStore = create<BoardEditModeState>((set) => ({
  editMode: false,
  toggle: () => set((state) => ({ editMode: !state.editMode })),
  setEditMode: (value) => set({ editMode: value }),
}))
