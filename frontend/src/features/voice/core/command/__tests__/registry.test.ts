import { describe, it, expect } from 'vitest'
import { createCommandRegistry } from '../registry'
import type { VoiceCommand } from '../types'

function stubCommand(id: string): VoiceCommand {
  return {
    id,
    title: id,
    description: `desc ${id}`,
    examples: [`пример ${id}`],
    riskLevel: 'safe',
    slots: [{ name: 'x', description: 'x' }],
    prepare: () => ({ ok: true, summary: id, run: async () => ({ message: id }) }),
  }
}

describe('createCommandRegistry', () => {
  it('регистрирует команды и отдаёт их по id и списком', () => {
    const a = stubCommand('a')
    const b = stubCommand('b')
    const registry = createCommandRegistry([a, b])

    expect(registry.all()).toEqual([a, b])
    expect(registry.get('a')).toBe(a)
    expect(registry.get('b')).toBe(b)
    expect(registry.get('missing')).toBeUndefined()
  })

  it('бросает при дублирующемся id', () => {
    expect(() =>
      createCommandRegistry([stubCommand('dup'), stubCommand('dup')]),
    ).toThrowError(/Дублирующийся id/)
  })

  it('toSchema отдаёт сериализуемую схему без функций', () => {
    const registry = createCommandRegistry([stubCommand('a')])
    const schema = registry.toSchema()

    expect(schema).toHaveLength(1)
    expect(schema[0]).toEqual({
      id: 'a',
      title: 'a',
      description: 'desc a',
      examples: ['пример a'],
      riskLevel: 'safe',
      slots: [{ name: 'x', description: 'x' }],
    })
    // в схеме не должно быть исполняемых полей
    expect('prepare' in schema[0]).toBe(false)
  })
})
