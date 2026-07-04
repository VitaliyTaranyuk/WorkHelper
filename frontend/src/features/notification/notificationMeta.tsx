import type { ReactElement } from 'react'
import AlternateEmailIcon from '@mui/icons-material/AlternateEmail'
import AddTaskIcon from '@mui/icons-material/AddTask'
import VideocamOutlinedIcon from '@mui/icons-material/VideocamOutlined'
import NotificationsNoneOutlinedIcon from '@mui/icons-material/NotificationsNoneOutlined'

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
