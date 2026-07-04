import { describe, it, expect } from 'vitest'
import { buildVoiceContext, type VoiceContextInputs } from '../buildVoiceContext'

function inputs(over: Partial<VoiceContextInputs> = {}): VoiceContextInputs {
  return {
    user: { id: 'u1' },
    project: {
      id: 'p1',
      statuses: [
        { id: 1, code: 'To Do', description: 'To Do' },
        { id: 2, code: 'In Progress', description: '  ' },
        { id: 4, code: 'Done', description: 'Готово' },
      ],
      users: [
        { id: 'u1', firstName: 'Иван', lastName: 'Иванов', username: 'ivanov' },
        { id: 'u2', firstName: 'Пётр', lastName: 'Петров' },
      ],
    },
    activeSprintId: 's-active',
    sprints: [
      { id: 's-backlog', name: 'Backlog', isActive: false, isDefault: true },
      { id: 's-active', name: 'Спринт 1', isActive: true, isDefault: false },
    ],
    openTask: undefined,
    priorities: [
      { value: 'LOW', label: 'Низкий' },
      { value: 'MEDIUM', label: 'Средний' },
      { value: 'HIGH', label: 'Высокий' },
    ],
    ...over,
  }
}

describe('buildVoiceContext', () => {
  it('null без пользователя', () => {
    expect(buildVoiceContext(inputs({ user: null }))).toBeNull()
  })

  it('null без проекта', () => {
    expect(buildVoiceContext(inputs({ project: null }))).toBeNull()
  })

  it('null без спринта по умолчанию (Backlog)', () => {
    expect(
      buildVoiceContext(
        inputs({
          sprints: [
            { id: 's-active', name: 'Спринт 1', isActive: true, isDefault: false },
          ],
        }),
      ),
    ).toBeNull()
  })

  it('собирает проект, спринты, пользователя', () => {
    const ctx = buildVoiceContext(inputs())
    expect(ctx).not.toBeNull()
    expect(ctx!.projectId).toBe('p1')
    expect(ctx!.currentUserId).toBe('u1')
    expect(ctx!.defaultSprintId).toBe('s-backlog')
    expect(ctx!.activeSprintId).toBe('s-active')
  })

  it('участники: имя из firstName+lastName, username опционален', () => {
    const ctx = buildVoiceContext(inputs())!
    expect(ctx.lookup.members).toEqual([
      { id: 'u1', name: 'Иван Иванов', username: 'ivanov' },
      { id: 'u2', name: 'Пётр Петров', username: undefined },
    ])
  })

  it('label статуса: description, иначе code (пустой description → code)', () => {
    const ctx = buildVoiceContext(inputs())!
    expect(ctx.lookup.statuses).toEqual([
      { id: 1, code: 'To Do', label: 'To Do' },
      { id: 2, code: 'In Progress', label: 'In Progress' }, // description "  " → code
      { id: 4, code: 'Done', label: 'Готово' },
    ])
  })

  it('спринты: name (null→пустая строка), active, isDefault', () => {
    const ctx = buildVoiceContext(
      inputs({
        sprints: [
          { id: 's-backlog', name: null, isActive: false, isDefault: true },
          { id: 's-active', name: 'Спринт 1', isActive: true, isDefault: false },
        ],
      }),
    )!
    expect(ctx.lookup.sprints).toEqual([
      { id: 's-backlog', name: '', active: false, isDefault: true },
      { id: 's-active', name: 'Спринт 1', active: true, isDefault: false },
    ])
  })

  it('приоритеты пробрасываются', () => {
    const ctx = buildVoiceContext(inputs())!
    expect(ctx.lookup.priorities).toEqual([
      { value: 'LOW', label: 'Низкий' },
      { value: 'MEDIUM', label: 'Средний' },
      { value: 'HIGH', label: 'Высокий' },
    ])
  })

  it('openTask пробрасывается, если есть', () => {
    const ctx = buildVoiceContext(
      inputs({ openTask: { id: 't1', code: 'ТП-90', title: 'ADR' } }),
    )!
    expect(ctx.openTask).toEqual({ id: 't1', code: 'ТП-90', title: 'ADR' })
  })
})
