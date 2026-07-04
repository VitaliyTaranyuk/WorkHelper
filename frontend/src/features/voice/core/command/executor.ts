import type { CommandRegistry } from './registry'
import type {
  IntentResolution,
  RiskLevel,
  VoiceContext,
  VoiceCommandContext,
  VoiceCommandResult,
} from './types'

/**
 * Диспетчеризация командного режима (ТП-91 / F1) — эволюция `dispatchTranscript`
 * из ТП-22. Разбита на две фазы:
 *   1. `prepareCommand` — чистая (без побочных эффектов): по резолюции намерения
 *      находит команду и готовит её к исполнению. Результат показывается в UI
 *      (карточка подтверждения / уточнение) — ТП-95.
 *   2. `runPreparedCommand` — исполняет подготовленное замыкание (побочные
 *      эффекты через существующие мутации). Вызывается после подтверждения,
 *      если оно требуется (`needsConfirmation`).
 */

export type PreparedCommand =
  | { kind: 'unrecognized'; message: string }
  | { kind: 'clarify'; question: string }
  | {
      kind: 'ready'
      commandId: string
      title: string
      riskLevel: RiskLevel
      summary: string
      /** Низкая уверенность распознавания (эвристика/LLM) — требует подтверждения. */
      lowConfidence: boolean
      run: (ctx: VoiceCommandContext) => Promise<VoiceCommandResult>
    }

const DEFAULT_UNRECOGNIZED =
  'Не понял команду. Попробуйте переформулировать, например: «Создай задачу…» или «Открой доску».'

/**
 * Порог уверенности: ниже него даже safe-команда требует подтверждения. Точные
 * правила (ТП-94) дают ≥0.9; эвристика (ТП-96) — ниже, поэтому её результат
 * пользователь подтверждает (защита от ложного срабатывания перед мутацией).
 */
export const CONFIDENCE_CONFIRM_THRESHOLD = 0.8

/** Готовит команду к исполнению по резолюции намерения. Побочных эффектов нет. */
export function prepareCommand(
  registry: CommandRegistry,
  resolution: IntentResolution,
  ctx: VoiceContext,
): PreparedCommand {
  if (!resolution.commandId) {
    return {
      kind: 'unrecognized',
      message: resolution.clarification ?? DEFAULT_UNRECOGNIZED,
    }
  }

  const command = registry.get(resolution.commandId)
  if (!command) {
    return {
      kind: 'unrecognized',
      message: resolution.clarification ?? DEFAULT_UNRECOGNIZED,
    }
  }

  const prepared = command.prepare(resolution.slots, ctx)
  if (!prepared.ok) {
    return { kind: 'clarify', question: prepared.clarification }
  }

  return {
    kind: 'ready',
    commandId: command.id,
    title: command.title,
    riskLevel: command.riskLevel,
    summary: prepared.summary,
    lowConfidence: resolution.confidence < CONFIDENCE_CONFIRM_THRESHOLD,
    run: prepared.run,
  }
}

/**
 * Требует ли подготовленная команда явного подтверждения: небезопасное действие
 * ИЛИ низкая уверенность распознавания (эвристика/LLM).
 */
export function needsConfirmation(prepared: PreparedCommand): boolean {
  return (
    prepared.kind === 'ready' &&
    (prepared.riskLevel !== 'safe' || prepared.lowConfidence)
  )
}

/** Исполняет подготовленную команду. Бросает, если команда не готова к запуску. */
export function runPreparedCommand(
  prepared: PreparedCommand,
  ctx: VoiceCommandContext,
): Promise<VoiceCommandResult> {
  if (prepared.kind !== 'ready') {
    throw new Error('runPreparedCommand: команда не готова к исполнению')
  }
  return prepared.run(ctx)
}
