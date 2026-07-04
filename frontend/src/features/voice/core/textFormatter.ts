import {
  capitalizeFirst,
  stripFillers,
  transcriptToTaskDraft,
  type TaskDraft,
} from '../textUtils'

/**
 * ТП-88: форматирование распознанного текста. Допустима ТОЛЬКО безопасная
 * обработка (регистр, пунктуация, пробелы, читаемость, деление на название и
 * описание). Смысл не меняется, ничего не добавляется — никакого AI.
 * Отдельный слой конвейера, независимый от распознавания и намерений.
 */
export interface TextFormatter {
  /** Диктовка в одно поле: регистр, удаление явных междометий, лишних пробелов. */
  formatDictation(raw: string): string
  /** Диктовка задачи: первая законченная мысль → название, остальное → описание. */
  toTaskDraft(raw: string): TaskDraft
}

export const localTextFormatter: TextFormatter = {
  formatDictation: (raw) => capitalizeFirst(stripFillers(raw)),
  toTaskDraft: (raw) => transcriptToTaskDraft(raw),
}

export type { TaskDraft }
