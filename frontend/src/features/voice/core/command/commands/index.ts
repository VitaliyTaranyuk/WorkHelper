import { createCommandRegistry } from '../registry'
import type { VoiceCommand } from '../types'
import { createTaskCommand } from './createTaskCommand'
import { navigateCommand } from './navigateCommand'

/**
 * Единая точка сборки командного реестра (ТП-91 / F1). Новая голосовая команда
 * добавляется ОДНОЙ строкой в этот список — существующие команды и остальной
 * конвейер не меняются (требование масштабируемости, ADR-006).
 */
export const voiceCommands: VoiceCommand[] = [createTaskCommand, navigateCommand]

export const commandRegistry = createCommandRegistry(voiceCommands)
