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
 * Web Speech API в ru-RU обычно НЕ расставляет пунктуацию — тогда вся диктовка
 * оказывается одним «предложением», название раздувается и упирается в лимит
 * 255 символов на бэкенде (ТП-57: создание задачи падало с 400). Мягкий предел
 * названия — как у кратких summary в зрелых TMS.
 */
const TITLE_MAX_CHARS = 80

/** Делит длинное «предложение» по границе слова: начало → название, хвост → описание. */
function splitLongSentence(sentence: string): { title: string; rest?: string } {
  if (sentence.length <= TITLE_MAX_CHARS) return { title: sentence }
  const words = sentence.split(/\s+/)
  let title = words[0] ?? ''
  for (const word of words.slice(1)) {
    if (`${title} ${word}`.length > TITLE_MAX_CHARS) break
    title = `${title} ${word}`
  }
  const rest = sentence.slice(title.length).trim()
  return { title, rest: rest.length > 0 ? rest : undefined }
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

  const first = splitLongSentence(sentences[0].replace(/[.!?…]+$/, '').trim())
  const rest = [...(first.rest ? [first.rest] : []), ...sentences.slice(1)].map(
    (s) => capitalizeFirst(ensurePeriod(s)),
  )

  return {
    title: capitalizeFirst(first.title),
    description: rest.length > 0 ? rest.join('\n') : undefined,
  }
}
