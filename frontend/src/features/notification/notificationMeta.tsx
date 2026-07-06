import type { ReactElement } from 'react'
import AlternateEmailIcon from '@mui/icons-material/AlternateEmail'
import AddTaskIcon from '@mui/icons-material/AddTask'
import VideocamOutlinedIcon from '@mui/icons-material/VideocamOutlined'
import NotificationsNoneOutlinedIcon from '@mui/icons-material/NotificationsNoneOutlined'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'

/**
 * Реестр типов уведомлений (ТП-59): единая точка расширения — новый тип
 * события на бэкенде = одна запись здесь (иконка + заголовок). Список,
 * клик-переходы и статусы прочтения общие для всех типов.
 */
export type NotificationMeta = {
  title: string
  icon: ReactElement
}

const iconSx = { fontSize: 18 } as const

const NOTIFICATION_META: Record<string, NotificationMeta> = {
  MENTION: {
    title: 'Упоминание',
    icon: <AlternateEmailIcon sx={iconSx} />,
  },
  TASK_CREATED: {
    title: 'Задача создана',
    icon: <AddTaskIcon sx={iconSx} />,
  },
  MEETING_REMINDER: {
    title: 'Напоминание о встрече',
    icon: <VideocamOutlinedIcon sx={iconSx} />,
  },
}

const FALLBACK_META: NotificationMeta = {
  title: 'Уведомление',
  icon: <NotificationsNoneOutlinedIcon sx={iconSx} />,
}

export function getNotificationMeta(type: string): NotificationMeta {
  return NOTIFICATION_META[type] ?? FALLBACK_META
}

/**
 * ТП-83: иконка уведомления о создании задачи отражает ТЕКУЩЕЕ состояние задачи —
 * завершена / отменена / активна (различие прежде всего иконкой, стиль тот же).
 * То же уведомление, без создания новых. Легко расширяется новыми состояниями.
 */
const TASK_STATE_ICON: Record<string, ReactElement> = {
  DONE: <CheckCircleOutlineIcon sx={iconSx} />,
  CANCELED: <CancelOutlinedIcon sx={iconSx} />,
  DELETED: <DeleteOutlineIcon sx={iconSx} />,
}

/** ТП-152: задача удалена — уведомление любого типа помечается удалённым. */
export function isTaskDeleted(taskState?: string | null): boolean {
  return taskState === 'DELETED'
}

export function getNotificationIcon(
  type: string,
  taskState?: string | null,
): ReactElement {
  // ТП-152: удалённая задача перекрывает тип — история сохраняется, но вид
  // уведомления явно говорит, что задачи больше нет (для всех типов).
  if (isTaskDeleted(taskState)) return TASK_STATE_ICON.DELETED
  if (type === 'TASK_CREATED' && taskState && TASK_STATE_ICON[taskState])
    return TASK_STATE_ICON[taskState]
  return getNotificationMeta(type).icon
}

/**
 * ТП-87: цвет иконки-кружка уведомления по состоянию задачи — завершённые
 * выделяются зелёным (успех, конвенция TMS: GitHub/Linear), отменённые
 * приглушены серым; активные — фирменный индиго. `color` — цвет иконки,
 * `backgroundColor` — фон кружка. Тон согласован с дизайн-системой.
 */
export type NotificationIconStyle = { color: string; backgroundColor: string }

const DEFAULT_ICON_STYLE: NotificationIconStyle = {
  color: 'primary.main',
  backgroundColor: 'rgba(99,102,241,0.1)',
}

const TASK_STATE_ICON_STYLE: Record<string, NotificationIconStyle> = {
  DONE: { color: 'success.main', backgroundColor: 'rgba(46,125,50,0.12)' },
  CANCELED: { color: 'text.disabled', backgroundColor: 'rgba(0,0,0,0.06)' },
  // ТП-152: удалённая — приглушена сильнее отменённой, но отличима иконкой
  DELETED: { color: 'text.disabled', backgroundColor: 'rgba(0,0,0,0.06)' },
  ACTIVE: DEFAULT_ICON_STYLE,
}

export function getNotificationIconStyle(
  type: string,
  taskState?: string | null,
): NotificationIconStyle {
  if (isTaskDeleted(taskState)) return TASK_STATE_ICON_STYLE.DELETED
  if (type === 'TASK_CREATED' && taskState && TASK_STATE_ICON_STYLE[taskState])
    return TASK_STATE_ICON_STYLE[taskState]
  return DEFAULT_ICON_STYLE
}
