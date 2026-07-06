/**
 * Чистые текстовые примитивы уровня предложений (ТП-153: вынесены из
 * features/voice/textUtils, чтобы единый движок названий generateTaskTitle
 * не тянул зависимость на голосовой модуль и не создавал циклов импортов).
 */

export function capitalizeFirst(text: string): string {
  const t = text.trim()
  return t.length === 0 ? t : t.charAt(0).toUpperCase() + t.slice(1)
}

/**
 * Разбивает текст на предложения по финальной пунктуации. Текст без
 * пунктуации остаётся одним предложением (ничего не придумываем).
 */
export function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
}
