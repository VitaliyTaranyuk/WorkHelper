import { describe, it, expect, vi } from 'vitest'
import { createCommandRegistry } from '../registry'
import {
  prepareCommand,
  needsConfirmation,
  runPreparedCommand,
} from '../executor'
import type { IntentResolution, VoiceCommand, VoiceCommandContext } from '../types'
import { makeContext } from './fixtures'

function cmd(over: Partial<VoiceCommand> & { id: string }): VoiceCommand {
  return {
    id: over.id,
    title: over.title ?? over.id,
    description: 'd',
    examples: [],
    riskLevel: over.riskLevel ?? 'safe',
    slots: [],
    prepare:
      over.prepare ??
      (() => ({ ok: true, summary: 'ок', run: async () => ({ message: 'done' }) })),
  }
}

const resolution = (over: Partial<IntentResolution>): IntentResolution => ({
  commandId: null,
  slots: {},
  confidence: 1,
  ...over,
})

describe('prepareCommand', () => {
  const ctx = makeContext()

  it('commandId=null → unrecognized (с текстом резолвера, если есть)', () => {
    const registry = createCommandRegistry([cmd({ id: 'a' })])
    expect(prepareCommand(registry, resolution({ commandId: null }), ctx)).toEqual({
      kind: 'unrecognized',
      message: expect.stringContaining('Не понял'),
    })
    expect(
      prepareCommand(
        registry,
        resolution({ commandId: null, clarification: 'своя подсказка' }),
        ctx,
      ),
    ).toEqual({ kind: 'unrecognized', message: 'своя подсказка' })
  })

  it('неизвестный commandId → unrecognized', () => {
    const registry = createCommandRegistry([cmd({ id: 'a' })])
    expect(
      prepareCommand(registry, resolution({ commandId: 'missing' }), ctx).kind,
    ).toBe('unrecognized')
  })

  it('prepare вернул отказ → clarify', () => {
    const registry = createCommandRegistry([
      cmd({
        id: 'a',
        prepare: () => ({ ok: false, clarification: 'уточните' }),
      }),
    ])
    expect(prepareCommand(registry, resolution({ commandId: 'a' }), ctx)).toEqual({
      kind: 'clarify',
      question: 'уточните',
    })
  })

  it('успешный prepare → ready c summary/riskLevel/run', () => {
    const registry = createCommandRegistry([
      cmd({
        id: 'a',
        title: 'Команда А',
        riskLevel: 'confirm',
        prepare: () => ({
          ok: true,
          summary: 'сделать А',
          run: async () => ({ message: 'готово' }),
        }),
      }),
    ])
    const prepared = prepareCommand(registry, resolution({ commandId: 'a' }), ctx)
    expect(prepared.kind).toBe('ready')
    if (prepared.kind !== 'ready') return
    expect(prepared).toMatchObject({
      commandId: 'a',
      title: 'Команда А',
      riskLevel: 'confirm',
      summary: 'сделать А',
    })
  })
})

describe('needsConfirmation', () => {
  it('safe → false, confirm/destructive → true', () => {
    const base = { kind: 'ready' as const, commandId: 'a', title: 'a', summary: 's', run: async () => ({ message: '' }) }
    expect(needsConfirmation({ ...base, riskLevel: 'safe' })).toBe(false)
    expect(needsConfirmation({ ...base, riskLevel: 'confirm' })).toBe(true)
    expect(needsConfirmation({ ...base, riskLevel: 'destructive' })).toBe(true)
    expect(needsConfirmation({ kind: 'clarify', question: 'q' })).toBe(false)
  })
})

describe('runPreparedCommand', () => {
  it('исполняет run у ready-команды', async () => {
    const registry = createCommandRegistry([
      cmd({
        id: 'a',
        prepare: () => ({
          ok: true,
          summary: 's',
          run: async () => ({ message: 'исполнено' }),
        }),
      }),
    ])
    const prepared = prepareCommand(registry, resolution({ commandId: 'a' }), makeContext())
    const services = {} as VoiceCommandContext
    await expect(runPreparedCommand(prepared, services)).resolves.toEqual({
      message: 'исполнено',
    })
  })

  it('бросает, если команда не ready', async () => {
    expect(() =>
      runPreparedCommand({ kind: 'clarify', question: 'q' }, {} as VoiceCommandContext),
    ).toThrowError(/не готова/)
  })

  it('прокидывает контекст-сервисы в run', async () => {
    const spy = vi.fn(async () => ({ message: 'ok' }))
    const registry = createCommandRegistry([
      cmd({ id: 'a', prepare: () => ({ ok: true, summary: 's', run: spy }) }),
    ])
    const prepared = prepareCommand(registry, resolution({ commandId: 'a' }), makeContext())
    const services = { foo: 1 } as unknown as VoiceCommandContext
    await runPreparedCommand(prepared, services)
    expect(spy).toHaveBeenCalledWith(services)
  })
})
