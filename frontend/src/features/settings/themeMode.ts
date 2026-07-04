import { useEffect, useSyncExternalStore } from 'react'

/**
 * Режим темы приложения (ТП-64): light / dark / system. Хранится в localStorage
 * (per-браузер, без изменений API — как хоткей голосового управления). Эффективная
 * тема применяется к <html data-theme> (CSS-токены) и синхронизируется с MUI
 * через ThemeProvider.
 */
export type ThemeMode = 'light' | 'dark' | 'system'
export type EffectiveTheme = 'light' | 'dark'

const STORAGE_KEY = 'wt.theme-mode'

export function loadThemeMode(): ThemeMode {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    if (v === 'light' || v === 'dark' || v === 'system') return v
  } catch {
    /* приватный режим */
  }
  return 'system'
}

function saveThemeMode(mode: ThemeMode) {
  try {
    localStorage.setItem(STORAGE_KEY, mode)
  } catch {
    /* приватный режим — не сохранится, но работать будет */
  }
}

function systemPrefersDark(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-color-scheme: dark)').matches
  )
}

export function resolveEffective(mode: ThemeMode): EffectiveTheme {
  if (mode === 'system') return systemPrefersDark() ? 'dark' : 'light'
  return mode
}

// --- Небольшой store на useSyncExternalStore, чтобы и ThemeProvider, и страница
//     настроек видели один источник истины и ре-рендерились при смене темы. ---

let currentMode: ThemeMode = loadThemeMode()
const listeners = new Set<() => void>()

function emit() {
  for (const l of listeners) l()
}

export function setThemeMode(mode: ThemeMode) {
  currentMode = mode
  saveThemeMode(mode)
  emit()
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb)
  // Реагируем на смену системной темы, когда выбран режим system.
  const mq = window.matchMedia?.('(prefers-color-scheme: dark)')
  const onChange = () => {
    if (currentMode === 'system') emit()
  }
  mq?.addEventListener?.('change', onChange)
  return () => {
    listeners.delete(cb)
    mq?.removeEventListener?.('change', onChange)
  }
}

export function useThemeMode(): {
  mode: ThemeMode
  effective: EffectiveTheme
  setMode: (m: ThemeMode) => void
} {
  const mode = useSyncExternalStore(
    subscribe,
    () => currentMode,
    () => currentMode,
  )
  const effective = resolveEffective(mode)

  // Держим data-theme на <html> в актуальном состоянии.
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', effective)
  }, [effective])

  return { mode, effective, setMode: setThemeMode }
}
