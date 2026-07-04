import { commandRegistry } from '../core/command/commands'

/**
 * Встроенная обучающая подсказка (ТП-103): примеры голосовых команд,
 * СГЕНЕРИРОВАННЫЕ из реестра (по одному примеру на команду). Не дублирует список
 * команд — при добавлении команды подсказка обновляется автоматически.
 */
export type VoiceHelpItem = { title: string; example: string }

export function voiceHelpItems(): VoiceHelpItem[] {
  return commandRegistry
    .all()
    .filter((c) => c.examples.length > 0)
    .map((c) => ({ title: c.title, example: c.examples[0] }))
}
