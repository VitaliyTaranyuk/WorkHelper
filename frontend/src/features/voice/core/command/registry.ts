import type { CommandSchema, VoiceCommand } from './types'

/**
 * Реестр голосовых команд (ТП-91 / F1) — эволюция `commandRegistry` из ТП-22.
 *
 * Собирается из явного списка команд (а не через side-effect регистрацию, как
 * раньше): tree-shake-безопасно, тестируемо, детерминированный порядок. Новая
 * команда = одна строка в `commands/index.ts`, существующие команды не меняются.
 */
export type CommandRegistry = {
  /** Все команды в порядке регистрации. */
  all(): VoiceCommand[]
  /** Команда по id или undefined. */
  get(id: string): VoiceCommand | undefined
  /** Схема команд для резолвера (ТП-94): id/описание/примеры/слоты/риск. */
  toSchema(): CommandSchema
}

export function createCommandRegistry(
  commands: VoiceCommand[],
): CommandRegistry {
  const map = new Map<string, VoiceCommand>()
  for (const command of commands) {
    if (map.has(command.id)) {
      throw new Error(`Дублирующийся id голосовой команды: ${command.id}`)
    }
    map.set(command.id, command)
  }

  return {
    all: () => [...map.values()],
    get: (id) => map.get(id),
    toSchema: () =>
      [...map.values()].map((c) => ({
        id: c.id,
        title: c.title,
        description: c.description,
        examples: c.examples,
        riskLevel: c.riskLevel,
        slots: c.slots,
      })),
  }
}
