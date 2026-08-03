import { create } from 'zustand'

/**
 * Множественный выбор задач в «Списке задач» (T-309).
 *
 * <p>Выбор живёт во вкладке, а не в компоненте секции: панель действий
 * рендерится страницей, а чекбоксы — строками внутри разных секций спринтов.
 * Тот же приём, что у `moveToSprintMenuStore` и `boardEditModeStore`.
 *
 * <p>Поиск в «Списке задач» фильтрует клиентски и данные не теряет, поэтому
 * выбор переживает и поиск, и поллинг списков. Обратная сторона — можно
 * применить действие к задаче, которой сейчас не видно; поэтому счётчик
 * «Выбрано: N» показывается всегда, а `Esc` снимает выбор (паттерн Linear).
 */
interface TaskSelectionState {
  selectedIds: string[]
  /** Последняя задача, отмеченная кликом, — якорь для выбора диапазоном. */
  anchorId: string | null
  toggle: (taskId: string) => void
  /** Выбрать диапазон от якоря до `taskId` в порядке `orderedIds`. */
  selectRange: (taskId: string, orderedIds: string[]) => void
  /** Оставить только те id, что ещё существуют (список перезапросился). */
  retain: (existingIds: Set<string>) => void
  clear: () => void
}

export const useTaskSelectionStore = create<TaskSelectionState>((set) => ({
  selectedIds: [],
  anchorId: null,

  toggle: (taskId) =>
    set((state) => {
      const selected = state.selectedIds.includes(taskId)
      return {
        selectedIds: selected
          ? state.selectedIds.filter((id) => id !== taskId)
          : [...state.selectedIds, taskId],
        // Якорь ставится и при снятии: Shift-клик после снятия должен считать
        // диапазон от последнего тронутого элемента, как в файловых менеджерах.
        anchorId: taskId,
      }
    }),

  selectRange: (taskId, orderedIds) =>
    set((state) => {
      const from = state.anchorId ? orderedIds.indexOf(state.anchorId) : -1
      const to = orderedIds.indexOf(taskId)
      // Якоря нет или он в другой секции — Shift-клик ведёт себя как обычный.
      if (from === -1 || to === -1) {
        return {
          selectedIds: state.selectedIds.includes(taskId)
            ? state.selectedIds
            : [...state.selectedIds, taskId],
          anchorId: taskId,
        }
      }
      const [start, end] = from <= to ? [from, to] : [to, from]
      const range = orderedIds.slice(start, end + 1)
      const merged = new Set(state.selectedIds)
      range.forEach((id) => merged.add(id))
      return { selectedIds: [...merged], anchorId: taskId }
    }),

  retain: (existingIds) =>
    set((state) => {
      const kept = state.selectedIds.filter((id) => existingIds.has(id))
      // Ссылку не меняем, если ничего не отпало: иначе подписчики
      // перерисовывались бы на каждом поллинге списка.
      if (kept.length === state.selectedIds.length) return state
      return {
        selectedIds: kept,
        anchorId:
          state.anchorId && existingIds.has(state.anchorId)
            ? state.anchorId
            : null,
      }
    }),

  clear: () => set({ selectedIds: [], anchorId: null }),
}))
