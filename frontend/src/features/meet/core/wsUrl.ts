import {
  WORKTECH_API_BASE_URL,
} from '@/config'

/**
 * Адрес сигналинга из базового адреса API: http(s) → ws(s), тот же хост и
 * префикс пути (прод — wss через nginx-location /work-task/ws/). JWT и токен
 * комнаты — в query: браузерный WebSocket не умеет заголовки.
 */
export function buildMeetWsUrl(roomToken: string, accessToken: string): string {
  const base = WORKTECH_API_BASE_URL.replace(/^http/, 'ws').replace(/\/$/, '')
  const params = new URLSearchParams({ room: roomToken, token: accessToken })
  return `${base}/work-task/ws/meet?${params.toString()}`
}
