import type { NavTarget, VoiceCommand } from '../types'

/**
 * Команда навигации по приложению (ТП-91 / F1). Вторая команда реестра —
 * доказывает расширяемость (safe-действие без побочных эффектов над данными) и
 * готовит почву для пачки навигации C5 (ТП-101).
 *
 * Слот `target` — раздел; сопоставляется по синонимам с типизированным
 * `NavTarget` (маппинг на router.navigate — в X1). Неизвестный раздел → уточнение
 * (ничего не выдумываем).
 */

type Destination = { stems: string[]; target: NavTarget; label: string }

/**
 * Разделы описаны СТЕМАМИ (префиксами), а не точными словами: русский язык
 * склоняет окончания («доску»/«доски»/«доской»), поэтому сопоставляем по началу
 * токена, а не по полному совпадению. Порядок — приоритет при неоднозначности.
 */
const DESTINATIONS: Destination[] = [
  { stems: ['доск', 'борд', 'board'], target: { kind: 'board' }, label: 'Доска' },
  {
    stems: ['задач', 'список', 'бэклог', 'беклог', 'backlog'],
    target: { kind: 'tasks' },
    label: 'Список задач',
  },
  {
    stems: ['спринт'],
    target: { kind: 'sprint' },
    label: 'Спринт',
  },
  {
    stems: ['календар', 'calendar'],
    target: { kind: 'calendar' },
    label: 'Календарь',
  },
  {
    stems: ['настройк', 'настроек', 'settings'],
    target: { kind: 'settings' },
    label: 'Настройки',
  },
]

function resolveDestination(raw: string): Destination | undefined {
  const tokens = raw
    .toLowerCase()
    .replace(/[.,!?]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
  for (const dest of DESTINATIONS) {
    if (tokens.some((token) => dest.stems.some((stem) => token.startsWith(stem)))) {
      return dest
    }
  }
  return undefined
}

export const navigateCommand: VoiceCommand = {
  id: 'app.navigate',
  title: 'Навигация',
  description:
    'Открывает раздел приложения: доска, список задач, календарь, настройки.',
  examples: [
    'Открой доску',
    'Перейти к задачам',
    'Открой календарь',
    'Открой настройки',
  ],
  riskLevel: 'safe',
  keywords: [
    'открой',
    'открыть',
    'перейди',
    'перейти',
    'покажи',
    'доска',
    'доску',
    'задачи',
    'бэклог',
    'календарь',
    'настройки',
  ],
  slots: [
    {
      name: 'target',
      description: 'Раздел приложения: доска | задачи | календарь | настройки',
      required: true,
      examples: ['доска', 'календарь', 'настройки'],
    },
  ],

  rule(text) {
    const trimmed = text.trim()
    const m = /^(?:открой|открыть|перей(?:ди|ти)|покажи|зайди(?:\s+в)?)\s+(.+)/iu.exec(
      trimmed,
    )
    if (m) return { slots: { target: m[1] }, confidence: 0.9 }
    // Голый раздел («доска», «список задач») — ТОЛЬКО короткая фраза (≤2 слов):
    // иначе стем «задач» ложно ловит «задачку»/«задачу» внутри предложения
    // (это создание задачи, а не переход в раздел «Задачи»).
    const wordCount = trimmed.split(/\s+/).filter(Boolean).length
    if (wordCount <= 2 && resolveDestination(trimmed)) {
      return { slots: { target: trimmed }, confidence: 0.7 }
    }
    return null
  },

  prepare(raw) {
    const dest = resolveDestination(raw.target ?? raw.content ?? raw.text ?? '')
    if (!dest) {
      return {
        ok: false,
        clarification:
          'Не понял, какой раздел открыть. Доступно: доска, список задач, календарь, настройки.',
      }
    }
    return {
      ok: true,
      summary: `Открыть раздел «${dest.label}»`,
      run: async (context) => {
        context.navigate(dest.target)
        return { message: `Открываю: ${dest.label}` }
      },
    }
  },
}
