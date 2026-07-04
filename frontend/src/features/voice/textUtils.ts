/**
 * Минимальная обработка распознанного текста (ТП-22). Правила из требования:
 * регистр, пунктуация, абзацы, удаление ТОЛЬКО очевидных междометий.
 * Смысл, содержание и формулировки не меняются.
 */

// Только бесспорные слова-паразиты/междометия: отдельно стоящие «э-э», «м-м»,
// «кхм» и их растянутые формы. Реальные слова под шаблон не попадают.
const FILLERS = /(^|\s)(э+м*|м+|гм+|кхм+|э+)([.,!?\s]|$)/giu

export function stripFillers(text: string): string {
  return text.replace(FILLERS, '$1').replace(/\s{2,}/g, ' ').trim()
}

export function capitalizeFirst(text: string): string {
  const t = text.trim()
  return t.length === 0 ? t : t.charAt(0).toUpperCase() + t.slice(1)
}

/**
 * Разбивает текст на предложения по финальной пунктуации. Web Speech API
 * в ru-RU расставляет точки не всегда — текст без пунктуации остаётся
 * одним предложением (ничего не придумываем).
 */
export function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
}

/** Гарантирует финальную точку у предложения (исправление пунктуации). */
function ensurePeriod(sentence: string): string {
  return /[.!?…]$/.test(sentence) ? sentence : `${sentence}.`
}

export type TaskDraft = {
  title: string
  description?: string
}

/**
 * Правило преобразования из требования: первая мысль (первое предложение) →
 * название, весь остальной контекст → описание (по предложению на строку —
 * «разбиение на абзацы» без изменения содержания).
 */
export function transcriptToTaskDraft(text: string): TaskDraft {
  const cleaned = capitalizeFirst(stripFillers(text))
  const sentences = splitSentences(cleaned)
  if (sentences.length === 0) return { title: '' }

  const title = sentences[0].replace(/[.!?…]+$/, '').trim()
  const rest = sentences.slice(1).map((s) => capitalizeFirst(ensurePeriod(s)))
  return {
    title: capitalizeFirst(title),
    description: rest.length > 0 ? rest.join('\n') : undefined,
  }
}
