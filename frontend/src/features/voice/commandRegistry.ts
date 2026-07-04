import type { VoiceCommand, VoiceCommandContext, VoiceCommandResult } from './types'

/**
 * Реестр голосовых команд (ТП-22). Порядок регистрации = порядок опроса.
 * Новая команда: создать файл в commands/, вызвать registerVoiceCommand —
 * существующие обработчики не меняются.
 */
const commands: VoiceCommand<unknown>[] = []

export function registerVoiceCommand<T>(command: VoiceCommand<T>) {
  if (commands.some((c) => c.id === command.id)) return
  commands.push(command as VoiceCommand<unknown>)
}

export function getRegisteredCommands(): ReadonlyArray<VoiceCommand<unknown>> {
  return commands
}

export class UnrecognizedCommandError extends Error {
  constructor() {
    super('Команда не распознана')
    this.name = 'UnrecognizedCommandError'
  }
}

/** Находит первую подходящую команду и выполняет её. */
export async function dispatchTranscript(
  transcript: string,
  ctx: VoiceCommandContext,
): Promise<VoiceCommandResult> {
  const text = transcript.trim()
  if (!text) throw new UnrecognizedCommandError()
  for (const command of commands) {
    const payload = command.match(text)
    if (payload !== null) {
      return command.execute(payload, ctx)
    }
  }
  throw new UnrecognizedCommandError()
}
