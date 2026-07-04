import type { CommandRegistry } from '../command/registry'
import type { IntentResolution, VoiceContext } from '../command/types'

/**
 * Резолвер намерения (ТП-94 / I1) — центральный слой распознавания за единым
 * интерфейсом (эволюция шва `IntentAnalyzer` из ТП-88). Реализации взаимозаменяемы:
 *   - `createRuleBasedResolver` — офлайн, БЕЗ AI/ключей/сети (Веха 1);
 *   - `RemoteResolver` (ТП-96) — backend-прокси + LLM, тот же интерфейс, с
 *     авто-фолбэком на правила.
 *
 * Уточнение архитектуры (повторный анализ ТП-94): правила НЕ требуют ключа, поэтому
 * работают на клиенте (без сетевого round-trip). Backend-прокси нужен только LLM —
 * он вводится в ТП-96, где живёт секрет. См. `.ai/VOICE_ARCHITECTURE.md` §5.
 */
export interface IntentResolver {
  resolve(text: string, ctx: VoiceContext): Promise<IntentResolution>
}

const EMPTY: IntentResolution = { commandId: null, slots: {}, confidence: 0 }

/**
 * Офлайн-резолвер: опрашивает офлайн-правила команд (`command.rule`) по порядку
 * реестра, первое совпадение выигрывает. Команды без `rule` пропускаются (их
 * распознаёт только LLM-резолвер).
 */
export function createRuleBasedResolver(
  registry: CommandRegistry,
): IntentResolver {
  return {
    resolve(text) {
      const t = text.trim()
      if (!t) return Promise.resolve(EMPTY)
      for (const command of registry.all()) {
        const match = command.rule?.(t)
        if (match) {
          return Promise.resolve({
            commandId: command.id,
            slots: match.slots,
            confidence: match.confidence ?? 0.9,
          })
        }
      }
      return Promise.resolve(EMPTY)
    },
  }
}
