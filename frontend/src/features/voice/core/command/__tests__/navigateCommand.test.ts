import { describe, it, expect, vi } from 'vitest'
import { navigateCommand } from '../commands/navigateCommand'
import type { NavTarget, VoiceCommandContext } from '../types'
import { makeContext } from './fixtures'

function servicesCapture() {
  let captured: NavTarget | undefined
  const navigate = vi.fn((t: NavTarget) => {
    captured = t
  })
  const ctx: VoiceCommandContext = {
    ...makeContext(),
    createTask: vi.fn(async () => ({ id: '', code: '', title: '' })),
    navigate,
    setStatus: vi.fn(async () => {}),
    setSprint: vi.fn(async () => {}),
    patchTask: vi.fn(async () => ({ id: '', code: '', title: '' })),
    findTask: vi.fn(async () => null),
  }
  return { ctx, navigate, target: () => captured }
}

describe('navigateCommand.prepare', () => {
  const ctx = makeContext()

  it.each([
    ['доску', 'board'],
    ['задачам', 'tasks'],
    ['бэклог', 'tasks'],
    ['календарь', 'calendar'],
    ['настройки', 'settings'],
  ])('распознаёт раздел «%s» → %s', async (word, kind) => {
    const res = navigateCommand.prepare({ target: word }, ctx)
    expect(res.ok).toBe(true)
    if (!res.ok) return
    const { ctx: services, target } = servicesCapture()
    await res.run(services)
    expect(target()?.kind).toBe(kind)
  })

  it('неизвестный раздел → уточнение', () => {
    const res = navigateCommand.prepare({ target: 'марс' }, ctx)
    expect(res.ok).toBe(false)
    if (res.ok) return
    expect(res.clarification).toMatch(/раздел/i)
  })

  it('мягкое совпадение по вхождению («открой мою доску»)', () => {
    expect(navigateCommand.prepare({ target: 'мою доску' }, ctx).ok).toBe(true)
  })

  it('это safe-команда', () => {
    expect(navigateCommand.riskLevel).toBe('safe')
  })
})
