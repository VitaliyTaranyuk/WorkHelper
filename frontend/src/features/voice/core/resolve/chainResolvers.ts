import type { IntentResolution, VoiceContext } from '../command/types'
import type { IntentResolver } from './intentResolver'

/**
 * Композиция резолверов (ТП-96): опрашивает по порядку, возвращает ПЕРВЫЙ
 * распознанный интент (`commandId !== null`). Порядок = приоритет:
 *   rule (точный, мгновенный, офлайн) → эвристика (нечёткая, локальная) → …LLM.
 *
 * Так точные команды остаются быстрыми и работают офлайн, а «умные» ступени
 * подключаются только когда предыдущие не распознали. Ошибку/недоступность
 * ступени (например, будущий сетевой LLM) поглощаем → переходим к следующей.
 */
const EMPTY: IntentResolution = { commandId: null, slots: {}, confidence: 0 }

export function chainResolvers(...resolvers: IntentResolver[]): IntentResolver {
  return {
    async resolve(text: string, ctx: VoiceContext) {
      for (const resolver of resolvers) {
        try {
          const result = await resolver.resolve(text, ctx)
          if (result.commandId) return result
        } catch {
          // ступень недоступна — пробуем следующую
        }
      }
      return EMPTY
    },
  }
}
