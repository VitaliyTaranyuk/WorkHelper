import type { ComponentType, CSSProperties } from 'react'
import ScienceOutlinedIcon from '@mui/icons-material/ScienceOutlined'
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder'
import TaskIcon from '@/shared/assets/icons/task.svg?react'
import BugIcon from '@/shared/assets/icons/bug.svg?react'
import { TASK_TYPE_TUPPLE, type TaskType } from './types'

/**
 * Представление типа задачи — ОДИН источник иконки и подписи для списков,
 * доски, карточки и формы. До этого иконка жила в `ui/TaskType.tsx`, а
 * подписи дублировались в двух местах формы, поэтому добавление типа
 * бэкенда требовало правок в трёх файлах и по факту не было сделано ни разу
 * (инцидент 2026-07-28: тип RESEARCH обнулял «Список задач»).
 *
 * Иконки: TASK/BUG — исторические ассеты проекта; RESEARCH/STORY — MUI
 * (outline-иконки того же веса, `currentColor` наследует цвет текста).
 */
export type TaskTypeIcon = ComponentType<{
  className?: string
  style?: CSSProperties
}>

export const TASK_TYPE_META: Record<
  TaskType,
  { label: string; Icon: TaskTypeIcon }
> = {
  TASK: { label: 'Задача', Icon: TaskIcon },
  BUG: { label: 'Баг', Icon: BugIcon },
  RESEARCH: { label: 'Исследование', Icon: ScienceOutlinedIcon },
  STORY: { label: 'История', Icon: BookmarkBorderIcon },
}

/** Порядок типов в выборе — как в кортеже (он же порядок бэкенда). */
export const TASK_TYPE_ORDER = TASK_TYPE_TUPPLE
