import { resolveSprint } from '../../resolve/entityResolver'
import { capitalizeFirst } from '../../../textUtils'
import type { VoiceCommand } from '../types'

/**
 * Команды жизненного цикла спринта (ТП-100 / C4): создать / активировать /
 * завершить. Через существующие мутации. Завершение — destructive (всегда
 * подтверждение + «зачитка»).
 */

const CREATE_TRIGGER =
  /^\s*(?:созда(?:й|йте|ть)|добав(?:ь|ьте|ить)|заведи(?:те)?|нов(?:ый|ую))\s+спринт\s*[:.,—-]*\s*/iu

export const sprintCreateCommand: VoiceCommand = {
  id: 'sprint.create',
  title: 'Создать спринт',
  description: 'Создаёт новый спринт с указанным названием.',
  examples: ['Создай спринт Релиз 1', 'Заведи спринт Стабилизация'],
  riskLevel: 'confirm',
  slots: [{ name: 'name', description: 'Название спринта', required: true }],

  rule(text) {
    const m = CREATE_TRIGGER.exec(text)
    if (!m) return null
    return { slots: { name: text.slice(m[0].length).trim() }, confidence: 0.95 }
  },

  prepare(raw) {
    const m = CREATE_TRIGGER.exec(raw.name ?? raw.text ?? '')
    const name = capitalizeFirst(
      (m ? (raw.name ?? '').slice(m[0].length) : (raw.name ?? '')).trim(),
    )
    if (name.length < 2) {
      return { ok: false, clarification: 'Как назвать спринт? Например: «Создай спринт Релиз 1».' }
    }
    return {
      ok: true,
      summary: `Создать спринт «${name}»`,
      run: async (context) => {
        await context.createSprint(name)
        return { message: `Спринт «${name}» создан` }
      },
    }
  },
}

export const sprintActivateCommand: VoiceCommand = {
  id: 'sprint.activate',
  title: 'Активировать спринт',
  description: 'Делает указанный спринт активным.',
  examples: ['Активируй спринт Релиз 1', 'Запусти спринт Стабилизация'],
  riskLevel: 'confirm',
  slots: [{ name: 'q', description: 'Название спринта', required: true }],

  rule(text) {
    if (!/(активир|запусти|запустить|стартуй)/iu.test(text)) return null
    if (!/спринт/iu.test(text)) return null
    return { slots: { q: text }, confidence: 0.9 }
  },

  prepare(raw, ctx) {
    const text = raw.q ?? raw.text ?? ''
    const sprint = resolveSprint(text, ctx)
    if (sprint.kind === 'none')
      return { ok: false, clarification: 'Какой спринт активировать? Назовите его.' }
    if (sprint.kind === 'ambiguous')
      return { ok: false, clarification: 'Уточните, какой спринт активировать.' }
    return {
      ok: true,
      summary: `Активировать спринт «${sprint.value.name || 'спринт'}»`,
      run: async (context) => {
        await context.activateSprint(sprint.value.id)
        return { message: `Спринт «${sprint.value.name || 'спринт'}» активирован` }
      },
    }
  },
}

export const sprintFinishCommand: VoiceCommand = {
  id: 'sprint.finish',
  title: 'Завершить спринт',
  description: 'Завершает спринт (активный или указанный).',
  examples: ['Заверши текущий спринт', 'Закрой спринт Релиз 1'],
  riskLevel: 'destructive',
  slots: [{ name: 'q', description: 'Спринт (или «текущий»)', required: false }],

  rule(text) {
    if (!/(заверши|завершить|закрой|закрыть|финиш)/iu.test(text)) return null
    if (!/спринт/iu.test(text)) return null
    return { slots: { q: text }, confidence: 0.9 }
  },

  prepare(raw, ctx) {
    const text = raw.q ?? raw.text ?? ''
    // «текущий/активный» или не указан → активный спринт.
    let sprint = resolveSprint(text, ctx)
    if (sprint.kind !== 'ok') {
      const active = ctx.lookup.sprints.find((s) => s.active)
      if (!active)
        return { ok: false, clarification: 'Нет активного спринта для завершения.' }
      sprint = { kind: 'ok', value: active }
    }
    const target = sprint.value
    return {
      ok: true,
      summary: `Завершить спринт «${target.name || 'активный'}» — незакрытые задачи уйдут в бэклог`,
      run: async (context) => {
        await context.finishSprint(target.id)
        return { message: `Спринт «${target.name || 'активный'}» завершён` }
      },
    }
  },
}
