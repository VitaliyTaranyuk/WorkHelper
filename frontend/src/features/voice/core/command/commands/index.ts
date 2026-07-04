import { createCommandRegistry } from '../registry'
import type { VoiceCommand } from '../types'
import { createTaskCommand } from './createTaskCommand'
import { createBugCommand } from './createBugCommand'
import { openTaskCommand } from './openTaskCommand'
import {
  assigneeCommand,
  priorityCommand,
  sprintCommand,
  statusCommand,
} from './attributeCommands'
import { navigateCommand } from './navigateCommand'

/**
 * Единая точка сборки командного реестра (ТП-91 / F1). Новая голосовая команда
 * добавляется ОДНОЙ строкой — существующие команды и остальной конвейер не
 * меняются (ADR-006).
 *
 * Порядок = приоритет опроса правил (rule): СПЕЦИФИЧНЫЕ команды раньше общих,
 * иначе общий триггер (создание/навигация) перехватит специфичную фразу.
 */
export const voiceCommands: VoiceCommand[] = [
  // Специфичные (узкие триггеры)
  createBugCommand, // «создай баг …»
  openTaskCommand, // «открой ТП-90»
  statusCommand, // «переведи … в готово»
  sprintCommand, // «перенеси … в спринт/бэклог»
  priorityCommand, // «приоритет … высокий»
  assigneeCommand, // «назначь … на Иванова»
  // Общие (широкие триггеры) — в конце
  createTaskCommand, // «создай задачу …»
  navigateCommand, // «открой доску/календарь …»
]

export const commandRegistry = createCommandRegistry(voiceCommands)
