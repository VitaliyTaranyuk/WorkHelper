import type { CommandRegistry } from '../command/registry'
import type { IntentResolution } from '../command/types'
import type { IntentResolver } from './intentResolver'
import { normalizeText, wordSimilar } from './textMatch'

/**
 * Эвристический резолвер (ТП-96) — локальная «умнее правил» ступень БЕЗ AI/сети.
 * Ловит свободные формулировки, которые пропускает строгое `rule` (ТП-94):
 * нечёткий (со склонениями) матч токенов фразы против `keywords` команд.
 *
 * Полную фразу кладём в первичный слот команды — извлечение делает сама команда
 * в `prepare` (она знает свою структуру). Уверенность НИЖЕ правил и ниже порога
 * подтверждения → результат эвристики пользователь подтверждает (защита от
 * ложного срабатывания перед мутацией; порог см. executor).
 *
 * Расширяемость: это ещё одна реализация `IntentResolver`. LLM-резолвер (за
 * backend-прокси, когда появится провайдер/ключ) встраивается в ту же цепочку
 * `chainResolvers`, не меняя правил и эвристики.
 */
const EMPTY: IntentResolution = { commandId: null, slots: {}, confidence: 0 }

export function createHeuristicResolver(
  registry: CommandRegistry,
): IntentResolver {
  const specs = registry
    .all()
    .filter((c) => c.keywords && c.keywords.length > 0)
    .map((c) => ({
      id: c.id,
      keywords: c.keywords!.map(normalizeText),
      primarySlot: c.slots[0]?.name,
    }))

  return {
    resolve(text) {
      const tokens = normalizeText(text)
        .split(' ')
        .filter((t) => t.length >= 2)
      if (tokens.length === 0) return Promise.resolve(EMPTY)

      let best: { id: string; primarySlot?: string; score: number } | null = null
      for (const spec of specs) {
        let score = 0
        for (const token of tokens) {
          if (spec.keywords.some((kw) => wordSimilar(token, kw))) score++
        }
        if (score > 0 && (!best || score > best.score)) {
          best = { id: spec.id, primarySlot: spec.primarySlot, score }
        }
      }
      if (!best) return Promise.resolve(EMPTY)

      const slots = best.primarySlot ? { [best.primarySlot]: text.trim() } : {}
      const confidence = Math.min(0.7, 0.35 + (best.score - 1) * 0.15)
      return Promise.resolve({ commandId: best.id, slots, confidence })
    },
  }
}
