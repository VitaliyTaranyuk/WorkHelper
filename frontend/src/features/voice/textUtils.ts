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

// ТП-153: примитивы предложений переехали в shared/text (нужны единому движку
// названий вне голосового модуля); реэкспорт сохраняет существующие импорты.
export { capitalizeFirst, splitSentences } from '@/shared/text/sentences'
import { capitalizeFirst, splitSentences } from '@/shared/text/sentences'
import { generateTaskTitle } from '@/shared/text/generateTaskTitle'

/** Гарантирует финальную точку у предложения (исправление пунктуации). */
function ensurePeriod(sentence: string): string {
  return /[.!?…]$/.test(sentence) ? sentence : `${sentence}.`
}

export type TaskDraft = {
  title: string
  description?: string
}

/**
 * Черновик задачи из диктовки. ТП-153: название формирует ЕДИНЫЙ движок
 * generateTaskTitle (тот же, что у формы создания) — второго алгоритма нет.
 * Описание — полный текст постановки (по предложению на строку, содержание
 * не меняется); если весь текст уместился в название — описание не нужно.
 */
export function transcriptToTaskDraft(text: string): TaskDraft {
  const cleaned = capitalizeFirst(stripFillers(text))
  const sentences = splitSentences(cleaned)
  if (sentences.length === 0) return { title: '' }

  const title = generateTaskTitle(cleaned)
  const bare = (s: string) => s.replace(/[.!?…]+$/, '').trim().toLowerCase()
  // Однопредложная постановка, полностью ушедшая в название, — без описания.
  if (sentences.length === 1 && bare(sentences[0]) === bare(title)) {
    return { title }
  }
  const description = sentences
    .map((s) => capitalizeFirst(ensurePeriod(s)))
    .join('\n')
  return { title, description }
}
