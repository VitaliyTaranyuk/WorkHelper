import { resolveTaskRef } from '../../resolve/entityResolver'
import type { VoiceCommand } from '../types'

/**
 * Команда «открой задачу …» (ТП-97 / C1). Открывает задачу по коду (ТП-90) —
 * навигация на карточку. safe. Ссылку на задачу извлекает F3.resolveTaskRef.
 */
export const openTaskCommand: VoiceCommand = {
  id: 'task.open',
  title: 'Открыть задачу',
  description: 'Открывает карточку задачи по её коду.',
  examples: ['Открой задачу ТП-90', 'Покажи ТП-91'],
  riskLevel: 'safe',
  slots: [{ name: 'q', description: 'Код задачи', required: true }],

  rule(text) {
    // Триггер: глагол открытия + КОД задачи (или «эту задачу»). Требование кода
    // отличает «открой ТП-90» (эта команда) от «открой задачи» (раздел → навигация).
    if (!/(открой|открыть|покажи|перей(?:ди|ти))/iu.test(text)) return null
    if (!/([a-zа-яё]{2,4}\s*-?\s*\d{1,6}|эту\s+задач)/iu.test(text)) return null
    return { slots: { q: text }, confidence: 0.9 }
  },

  prepare(raw, ctx) {
    const text = raw.q ?? raw.text ?? ''
    const ref = resolveTaskRef(text, ctx)

    if (ref.kind !== 'ok') {
      // «открой эту задачу» — если уже открыта, нечего делать; иначе просим код.
      if (ctx.openTask) {
        return { ok: false, clarification: 'Эта задача уже открыта.' }
      }
      return {
        ok: false,
        clarification: 'Назовите код задачи, например «Открой ТП-90».',
      }
    }

    const code = ref.value.kind === 'code' ? ref.value.code : ref.value.task.code
    return {
      ok: true,
      summary: `Открыть задачу ${code}`,
      run: async (context) => {
        context.navigate({ kind: 'task', code })
        return { message: `Открываю ${code}`, taskCode: code }
      },
    }
  },
}
