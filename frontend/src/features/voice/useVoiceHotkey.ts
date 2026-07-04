import { useEffect, useState } from 'react'

/**
 * Настраиваемая горячая клавиша голосового ввода (ТП-22).
 * Формат: "ctrl+shift+m" (модификаторы + одна клавиша), хранится в
 * localStorage — настройка per-браузер, без изменений API.
 */

const STORAGE_KEY = 'voice.hotkey'
export const DEFAULT_HOTKEY = 'ctrl+shift+m'

export function loadHotkey(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) || DEFAULT_HOTKEY
  } catch {
    return DEFAULT_HOTKEY
  }
}

export function saveHotkey(hotkey: string) {
  try {
    localStorage.setItem(STORAGE_KEY, hotkey)
  } catch {
    // приватный режим — настройка не сохранится, но работать будет
  }
}

/** Собирает строку хоткея из события клавиатуры; null для «голых» модификаторов. */
export function hotkeyFromEvent(e: KeyboardEvent): string | null {
  const key = e.key.toLowerCase()
  if (['control', 'shift', 'alt', 'meta'].includes(key)) return null
  const parts: string[] = []
  if (e.ctrlKey) parts.push('ctrl')
  if (e.altKey) parts.push('alt')
  if (e.shiftKey) parts.push('shift')
  if (e.metaKey) parts.push('meta')
  parts.push(key)
  return parts.join('+')
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return (
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.isContentEditable
  )
}

/** Глобальный слушатель хоткея; не срабатывает при вводе текста в поля. */
export function useVoiceHotkey(hotkey: string, onTrigger: () => void) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return
      if (hotkeyFromEvent(e) === hotkey) {
        e.preventDefault()
        onTrigger()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [hotkey, onTrigger])
}

/** Хоткей как состояние + сохранение в localStorage. */
export function useHotkeySetting() {
  const [hotkey, setHotkey] = useState(loadHotkey)
  const update = (next: string) => {
    setHotkey(next)
    saveHotkey(next)
  }
  return [hotkey, update] as const
}

/** «ctrl+shift+m» → «Ctrl + Shift + M» для отображения. */
export function formatHotkey(hotkey: string): string {
  return hotkey
    .split('+')
    .map((p) => (p.length === 1 ? p.toUpperCase() : p.charAt(0).toUpperCase() + p.slice(1)))
    .join(' + ')
}
