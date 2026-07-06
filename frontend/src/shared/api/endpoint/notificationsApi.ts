import { API_ENDPOINT_PATH } from '../endpointPath'
import { workTechApiClient } from '../workTechHttpClient'
import type { RequestParams } from './type'

export type NotificationDto = {
  id: string
  type: string
  message: string
  taskId?: string | null
  taskCode?: string | null
  commentId?: string | null
  meetingId?: string | null
  projectId?: string | null
  link?: string | null
  actorUsername?: string | null
  read: boolean
  createdAt: string
  // ТП-83: текущее состояние связанной задачи для выбора иконки уведомления.
  // ТП-152: DELETED — задача удалена (вид меняется, карточка не открывается).
  taskState?: 'ACTIVE' | 'DONE' | 'CANCELED' | 'DELETED' | null
}

export type UnreadCountDto = { count: number }

export function getNotifications({
  otherParams = {},
}: { otherParams?: RequestParams } = {}) {
  return workTechApiClient<NotificationDto[]>({
    method: 'GET',
    url: API_ENDPOINT_PATH.NOTIFICATIONS.LIST(),
    ...otherParams,
  })
}

export function getUnreadCount({
  otherParams = {},
}: { otherParams?: RequestParams } = {}) {
  return workTechApiClient<UnreadCountDto>({
    method: 'GET',
    url: API_ENDPOINT_PATH.NOTIFICATIONS.UNREAD_COUNT(),
    ...otherParams,
  })
}

export function markRead({
  id,
  otherParams = {},
}: {
  id: string
  otherParams?: RequestParams
}) {
  return workTechApiClient({
    method: 'PUT',
    url: API_ENDPOINT_PATH.NOTIFICATIONS.MARK_READ({ id }),
    ...otherParams,
  })
}

export function markAllRead({
  otherParams = {},
}: { otherParams?: RequestParams } = {}) {
  return workTechApiClient({
    method: 'PUT',
    url: API_ENDPOINT_PATH.NOTIFICATIONS.MARK_ALL_READ(),
    ...otherParams,
  })
}
