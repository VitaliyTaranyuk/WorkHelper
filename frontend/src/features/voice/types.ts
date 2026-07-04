import type { TaskModelDTO } from '@/data-contracts'

/**
 * Контракты подсистемы голосового взаимодействия (ТП-22).
 *
 * Подсистема не знает о конкретных командах: команды регистрируются в
 * реестре (commandRegistry) и получают всё необходимое через
 * VoiceCommandContext. Добавление новой команды = новый файл в commands/
 * + registerVoiceCommand, существующий код не меняется.
 */

/** Сервисы приложения, доступные голосовым командам. */
export type VoiceCommandContext = {
  projectId: string
  /** Спринт по умолчанию (Backlog) — «входящие» для новых сущностей. */
  defaultSprintId: string
  createTask: (dto: TaskModelDTO) => Promise<{ id: string; code: string }>
  /** Навигация по приложению (для будущих команд «открой…»). */
  navigate: (to: string) => void
}

/** Результат выполнения команды — показывается пользователю. */
export type VoiceCommandResult = {
  message: string
  /** Код созданной/затронутой задачи — для перехода к карточке. */
  taskCode?: string
}

export interface VoiceCommand<TPayload = unknown> {
  /** Уникальный идентификатор команды. */
  id: string
  /** Подсказка пользователю: как позвать команду. */
  hint: string
  /**
   * Пытается распознать команду в тексте диктовки.
   * null — «не моя команда», реестр спросит следующую.
   */
  match(transcript: string): TPayload | null
  execute(payload: TPayload, ctx: VoiceCommandContext): Promise<VoiceCommandResult>
}
