/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string
  /** DSN мониторинга ошибок (ТП-175): пусто → SDK выключен. */
  readonly VITE_SENTRY_DSN?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

/** Релиз сборки (git SHA) — задаётся vite define на билде, 'dev' локально. */
declare const __APP_RELEASE__: string
