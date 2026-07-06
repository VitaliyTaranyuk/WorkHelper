/**
 * Единый движок формирования названия задачи из текста постановки (ТП-153).
 * Используется ВСЕМИ точками создания (форма, голос, будущие API) — второй
 * алгоритм заводить запрещено.
 *
 * Детерминированные преобразования (без AI — честная граница возможностей;
 * семантическое переформулирование «своими словами» — работа LLM, шов
 * готов: заменяется реализация этой функции, вызовы не меняются):
 *  1. срез вводных конструкций («необходимо», «нужно чтобы», «сделай так,
 *     чтобы», «прошу», …) — многократно, пока они есть;
 *  2. отсечение хвостов-пояснений («, а не …», «, потому что …», «, чтобы …»,
 *     « — иначе …»): контекст и причины остаются в описании, не в названии;
 *  3. безопасная перестановка багрепорта «При X <ломается> Y» → «Y <ломается>
 *     при X» — объект проблемы первым (сканируемость доски); только
 *     перестановка групп слов, падежи не трогаем;
 *  4. первая законченная мысль, обрезка по границе слова, без финальной точки.
 *
 * Грамматику пользователя не переписываем: номинализация глаголов («исправить
 * баг» → «исправление бага») требует согласования падежей и без морфологии
 * давала бы корявые фразы — осознанно не делаем.
 */

import { splitSentences, capitalizeFirst } from './sentences'

export const TITLE_MAX_CHARS = 80

/** Вводные конструкции, не несущие инженерной сути. Порядок важен: длинные раньше. */
const FILLER_PREFIXES: RegExp[] = [
  /^сделай(?:те)?\s+так\s*,?\s*чтобы\s+/iu,
  /^сделать\s+так\s*,?\s*чтобы\s+/iu,
  /^хотелось\s+бы\s*,?\s*(?:чтобы\s+)?/iu,
  /^хочу\s*,?\s*(?:чтобы\s+)?/iu,
  /^необходимо\s*,?\s*(?:чтобы\s+)?/iu,
  /^нужно\s*,?\s*(?:чтобы\s+)?/iu,
  /^надо\s*,?\s*(?:чтобы\s+)?/iu,
  /^требуется\s*,?\s*(?:чтобы\s+)?/iu,
  /^следует\s*,?\s*(?:чтобы\s+)?/iu,
  /^важно\s*,?\s*(?:чтобы\s+)?/iu,
  /^предлагаю\s*,?\s*(?:чтобы\s+)?/iu,
  /^прошу\s*,?\s*/iu,
  /^пожалуйста\s*,?\s*/iu,
  /^давай(?:те)?\s+/iu,
  /^есть\s+предложение\s*[:,-]?\s*/iu,
]

/**
 * Хвосты-пояснения: причина/альтернатива/цель — место им в описании.
 * Отрезаем только ПОСЛЕ содержательной части (не в начале фразы).
 */
const TAIL_CUTTERS: RegExp[] = [
  /,\s*а\s+не\s+.+$/iu,
  /,\s*потому\s+что\s+.+$/iu,
  /,\s*так\s+как\s+.+$/iu,
  /,\s*поскольку\s+.+$/iu,
  /,\s*чтобы\s+.+$/iu,
  /\s+—\s+иначе\s+.+$/iu,
]

/** Маркеры поломки для перестановки «При X <v> Y» → «Y <v> при X». */
const BREAKAGE_VERBS =
  '(?:ломается|не\\s+работает|падает|пропадает|зависает|съезжает|дублируется|не\\s+отображается|не\\s+открывается|не\\s+сохраняется|тормозит)'

const AT_BREAKAGE = new RegExp(
  `^при\\s+(.+?)\\s+${BREAKAGE_VERBS}\\s+(.+)$`,
  'iu',
)

function stripFillers(text: string): string {
  let out = text.trim()
  let changed = true
  while (changed) {
    changed = false
    for (const re of FILLER_PREFIXES) {
      const next = out.replace(re, '')
      if (next !== out) {
        out = next.trim()
        changed = true
      }
    }
  }
  return out
}

function cutExplanatoryTail(text: string): string {
  let out = text
  for (const re of TAIL_CUTTERS) {
    // Хвост режем только если остаётся содержательное начало (3+ слова).
    const next = out.replace(re, '')
    if (next !== out && next.trim().split(/\s+/).length >= 3) out = next.trim()
  }
  return out
}

/** «При X ломается Y» → «Y ломается при X»: объект проблемы — первым. */
function reorderBreakage(text: string): string {
  const m = text.match(AT_BREAKAGE)
  if (!m) return text
  const verb = text.match(new RegExp(BREAKAGE_VERBS, 'iu'))?.[0] ?? ''
  const [, condition, subject] = m
  return `${subject.trim()} ${verb} при ${condition.trim()}`
}

function clipToWordBoundary(sentence: string): string {
  if (sentence.length <= TITLE_MAX_CHARS) return sentence
  const words = sentence.split(/\s+/)
  let title = words[0] ?? ''
  for (const word of words.slice(1)) {
    if (`${title} ${word}`.length > TITLE_MAX_CHARS) break
    title = `${title} ${word}`
  }
  return title.length > TITLE_MAX_CHARS ? title.slice(0, TITLE_MAX_CHARS) : title
}

/** Название задачи из полного текста постановки. Пустой текст → ''. */
export function generateTaskTitle(text: string): string {
  const trimmed = text.trim()
  if (!trimmed) return ''

  // Первая законченная мысль ПОСЛЕ среза вводных: «Необходимо, чтобы …» —
  // вводная может стоять перед первой точкой.
  const cleaned = stripFillers(trimmed)
  const first = splitSentences(cleaned)[0] ?? ''
  const noTail = cutExplanatoryTail(first.replace(/[.!?…]+$/u, '').trim())
  const reordered = reorderBreakage(stripFillers(noTail))
  return capitalizeFirst(clipToWordBoundary(reordered))
}
