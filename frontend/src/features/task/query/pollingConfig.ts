/**
 * Интервалы фонового обновления данных (ТП-47).
 *
 * Паттерн топовых TMS: Trello/Jira/Linear используют realtime-каналы
 * (WebSocket), лёгкие инструменты и MVP-стадии — короткий поллинг +
 * refetch при фокусе вкладки (это же рекомендует TanStack Query).
 * Поллинг работает только на активной вкладке
 * (refetchIntervalInBackground: false) — фоновые вкладки не грузят сервер.
 * Переход на WebSocket/SSE — отдельным шагом, интерфейс не изменится.
 */
export const BOARD_POLL_INTERVAL_MS = 10_000
export const LISTS_POLL_INTERVAL_MS = 15_000
