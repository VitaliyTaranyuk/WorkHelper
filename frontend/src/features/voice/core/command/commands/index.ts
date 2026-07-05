import { createCommandRegistry } from '../registry'
import type { VoiceCommand } from '../types'
import { createTaskCommand } from './createTaskCommand'
import { createBugCommand } from './createBugCommand'
import { openTaskCommand } from './openTaskCommand'
import { commentCommand } from './commentCommand'
import {
  assigneeCommand,
  priorityCommand,
  sprintCommand,
  statusCommand,
} from './attributeCommands'
import {
  sprintActivateCommand,
  sprintCreateCommand,
  sprintFinishCommand,
} from './sprintCommands'
import { notificationsReadCommand } from './notificationsCommand'
import { meetingCommand } from './meetingCommand'
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
  commentCommand, // «прокомментируй … <текст>»
  meetingCommand, // «создай встречу … завтра в 15» (раньше assignee: «назначь»)
  statusCommand, // «переведи … в готово»
  sprintCommand, // «перенеси … в спринт/бэклог»
  priorityCommand, // «приоритет … высокий»
  assigneeCommand, // «назначь … на Иванова»
  sprintCreateCommand, // «создай спринт …»
  sprintActivateCommand, // «активируй спринт …»
  sprintFinishCommand, // «заверши спринт»
  notificationsReadCommand, // «прочитай уведомления»
  // Общие (широкие триггеры) — в конце
  createTaskCommand, // «создай задачу …»
  navigateCommand, // «открой доску/спринт/календарь …»
]

export const commandRegistry = createCommandRegistry(voiceCommands)
