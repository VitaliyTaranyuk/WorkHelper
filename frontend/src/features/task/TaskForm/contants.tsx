import { COLOR } from '@/shared/ui/theme/constants'
import {
  PRIORITY_LABELS,
  PRIORITY_COLORS_BORDERS,
} from '@/entities/task/constants'
import { TASK_PRIORITY_TUPPLE } from '@/entities/task/types'

/**
 * Варианты приоритета для формы и голосового контекста — выводятся из
 * перечисления бэкенда (`TASK_PRIORITY_TUPPLE`), чтобы новый приоритет не
 * приходилось добавлять в несколько списков (урок инцидента 2026-07-28).
 */
export const TASK_PRIORITY_OPTIONS = TASK_PRIORITY_TUPPLE.map((value) => ({
  value,
  label: PRIORITY_LABELS[value],
}))

// TODO: использовать в будущем цвета из UI-KIT
export const PRIORITY_COLOR = PRIORITY_COLORS_BORDERS

export const ACTIVE_COLOR = COLOR.main[500]
