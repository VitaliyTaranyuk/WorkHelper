/**
 * Meet-ссылки в поле Meeting.link (M5): то же поле, что у внешних сервисов
 * (Телемост и т.п.) — обратная совместимость полная, «своя» ссылка просто
 * распознаётся и открывается внутри SPA, а не новой вкладкой.
 */

export function buildMeetUrl(token: string): string {
  return `${window.location.origin}/meet/${token}`
}

/** Токен комнаты из ссылки, если это ссылка WorkTask Meet текущего инстанса. */
export function parseMeetToken(link: string | null | undefined): string | null {
  if (!link) return null
  try {
    const url = new URL(link, window.location.origin)
    if (url.origin !== window.location.origin) return null
    const match = url.pathname.match(/^\/meet\/([A-Za-z0-9_-]{16,})$/)
    return match ? match[1]! : null
  } catch {
    return null
  }
}
