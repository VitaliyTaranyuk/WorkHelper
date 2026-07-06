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

/**
 * Собирает строку хоткея из события клавиатуры; null для «голых» модификаторов.
 * Буквы/цифры берём из e.code (KeyM → «m»): раскладко-независимо — на русской
 * раскладке e.key той же клавиши даёт «ь», и хоткей не срабатывал (ТП-57).
 */
export function hotkeyFromEvent(e: KeyboardEvent): string | null {
  let key: string
  if (/^Key[A-Z]$/.test(e.code)) key = e.code.slice(3).toLowerCase()
  else if (/^Digit[0-9]$/.test(e.code)) key = e.code.slice(5)
  else key = e.key.toLowerCase()
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

/** Порог различения «нажал» и «удерживает» (ТП-155, push-to-talk). */
export const HOLD_THRESHOLD_MS = 400

/**
 * Глобальный слушатель хоткея; не срабатывает при вводе текста в поля.
 *
 * ТП-155 (push-to-talk): жизненный цикл нажатия — `onPress` на keydown
 * (автоповторы удержания игнорируются: раньше зажатый хоткей дребезжал
 * тумблером), `onRelease(heldMs)` при отпускании комбинации (главной клавиши
 * или модификатора). Решение «короткое нажатие vs удержание» принимает
 * вызывающая сторона по heldMs — сам хук политики не знает.
 */
export function useVoiceHotkey(
  hotkey: string,
  onPress: () => void,
  onRelease?: (heldMs: number) => void,
) {
  useEffect(() => {
    let downAt: number | null = null
    const mainKey = hotkey.split('+').pop() ?? ''

    const onKeyDown = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return
      if (hotkeyFromEvent(e) !== hotkey) return
      e.preventDefault()
      if (e.repeat || downAt !== null) return // автоповтор удержания
      downAt = performance.now()
      onPress()
    }

    // Отпускание: комбинация перестала быть полностью зажатой — отпущена
    // главная клавиша или любой модификатор из хоткея.
    const onKeyUp = (e: KeyboardEvent) => {
      if (downAt === null) return
      const released =
        hotkeyFromEvent(e) === hotkey || // keyup главной клавиши
        (hotkey.includes('ctrl') && !e.ctrlKey) ||
        (hotkey.includes('shift') && !e.shiftKey) ||
        (hotkey.includes('alt') && !e.altKey) ||
        (hotkey.includes('meta') && !e.metaKey) ||
        e.code.toLowerCase().endsWith(mainKey)
      if (!released) return
      const heldMs = performance.now() - downAt
      downAt = null
      onRelease?.(heldMs)
    }

    // Страховка: ушли с вкладки с зажатой комбинацией — считаем отпущенной.
    const onBlur = () => {
      if (downAt === null) return
      const heldMs = performance.now() - downAt
      downAt = null
      onRelease?.(heldMs)
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', onBlur)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', onBlur)
    }
  }, [hotkey, onPress, onRelease])
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
