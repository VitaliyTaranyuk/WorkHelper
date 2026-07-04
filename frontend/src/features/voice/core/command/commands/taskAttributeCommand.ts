import {
  resolveTaskRef,
  type ResolveOutcome,
  type TaskRef,
} from '../../resolve/entityResolver'
import type {
  RuleMatch,
  VoiceCommand,
  VoiceCommandContext,
  VoiceCommandResult,
  VoiceContext,
} from '../types'

/**
 * Фабрика команд «изменить атрибут задачи» (ТП-98 / C2): статус, приоритет,
 * спринт, исполнитель. Общий путь: определить целевую задачу (открытая «эту» или
 * по коду — F3.resolveTaskRef) + целевое значение (F3-резолвер) → подтверждение →
 * существующая мутация. riskLevel = confirm (меняем данные).
 *
 * Значение и ссылка на задачу извлекаются из ОДНОЙ фразы независимо (их резолверы
 * ищут непересекающиеся паттерны: код/«эту» против синонимов статуса/приоритета).
 */
type TaskTarget = { id: string; code: string; title: string }

export type TaskAttributeConfig<T> = {
  id: string
  title: string
  description: string
  examples: string[]
  /** Триггер: должен включать слова ЗНАЧЕНИЯ, чтобы отличать команды друг от друга. */
  trigger: RegExp
  /** F3-резолвер значения из фразы. */
  resolveValue: (text: string, ctx: VoiceContext) => ResolveOutcome<T>
  /** Подпись значения для summary/сообщения. */
  valueLabel: (value: T) => string
  /** Текст уточнения, если значение не распознано. */
  valueClarify: string
  /** Применение изменения через сервисы (существующие мутации). */
  apply: (
    task: TaskTarget,
    value: T,
    ctx: VoiceCommandContext,
  ) => Promise<VoiceCommandResult>
}

function describeTask(ref: ResolveOutcome<TaskRef>, ctx: VoiceContext): string {
  if (ref.kind === 'ok') {
    if (ref.value.kind === 'open')
      return `${ref.value.task.code} «${ref.value.task.title}»`
    return ref.value.code
  }
  return ctx.openTask
    ? `${ctx.openTask.code} «${ctx.openTask.title}»`
    : 'задача'
}

async function resolveTarget(
  ref: ResolveOutcome<TaskRef>,
  ctx: VoiceCommandContext,
): Promise<TaskTarget | null> {
  if (ref.kind === 'ok') {
    if (ref.value.kind === 'open') return ref.value.task
    return ctx.findTask(ref.value.code)
  }
  return ctx.openTask ?? null
}

export function taskAttributeCommand<T>(
  cfg: TaskAttributeConfig<T>,
): VoiceCommand {
  return {
    id: cfg.id,
    title: cfg.title,
    description: cfg.description,
    examples: cfg.examples,
    riskLevel: 'confirm',
    slots: [
      { name: 'q', description: 'Задача (код/«эту») и целевое значение', required: true },
    ],
    rule(text): RuleMatch | null {
      return cfg.trigger.test(text) ? { slots: { q: text }, confidence: 0.9 } : null
    },
    prepare(raw, ctx) {
      const text =
        raw.q ?? raw.content ?? raw.text ?? Object.values(raw).join(' ')

      const value = cfg.resolveValue(text, ctx)
      if (value.kind === 'none') {
        return { ok: false, clarification: cfg.valueClarify }
      }
      if (value.kind === 'ambiguous') {
        return { ok: false, clarification: `${cfg.valueClarify} Уточните.` }
      }

      const ref = resolveTaskRef(text, ctx)
      if (ref.kind !== 'ok' && !ctx.openTask) {
        return {
          ok: false,
          clarification:
            'Не понял, какую задачу изменить. Откройте задачу или назовите её код.',
        }
      }

      const summary = `${cfg.title}: ${describeTask(ref, ctx)} → ${cfg.valueLabel(value.value)}`
      return {
        ok: true,
        summary,
        run: async (context) => {
          const task = await resolveTarget(ref, context)
          if (!task) {
            return { message: 'Задача не найдена — проверьте код.' }
          }
          return cfg.apply(task, value.value, context)
        },
      }
    },
  }
}
