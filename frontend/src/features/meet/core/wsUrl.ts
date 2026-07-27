import {
  WORKTECH_API_BASE_URL,
} from '@/config'

/**
 * Адрес сигналинга из базового адреса API: http(s) → ws(s), тот же хост и
 * префикс пути (прод — wss через nginx-location /work-task/ws/). JWT и токен
 * комнаты — в query: браузерный WebSocket не умеет заголовки.
 */
export function buildMeetWsUrl(roomToken: string, accessToken: string): string {
  // TD-024: базовый адрес API может быть пустым (относительные запросы к тому
  // же origin), но WebSocket требует абсолютный URL — берём origin страницы.
  const origin =
    WORKTECH_API_BASE_URL || (typeof window === 'undefined' ? '' : window.location.origin)
  const base = origin.replace(/^http/, 'ws').replace(/\/$/, '')
  const params = new URLSearchParams({ room: roomToken, token: accessToken })
  return `${base}/work-task/ws/meet?${params.toString()}`
}
