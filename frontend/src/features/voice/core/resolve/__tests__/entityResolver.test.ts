import { describe, it, expect } from 'vitest'
import {
  resolveMember,
  resolveStatus,
  resolvePriority,
  resolveSprint,
  resolveTaskRef,
} from '../entityResolver'
import { makeContext } from '../../command/__tests__/fixtures'
import type { VoiceStatus } from '../../command/types'

describe('resolveMember', () => {
  const ctx = makeContext()

  it.each([
    ['Ивану', 'u1'],
    ['Иванову', 'u1'],
    ['Иван Иванов', 'u1'],
    ['ivanov', 'u1'],
    ['Петру', 'u2'],
    ['Петрову', 'u2'],
    ['Пётр', 'u2'],
  ])('«%s» → %s (склонения/имя/фамилия/username)', (raw, id) => {
    const r = resolveMember(raw, ctx)
    expect(r.kind).toBe('ok')
    if (r.kind !== 'ok') return
    expect(r.value.id).toBe(id)
  })

  it('неизвестный участник → none', () => {
    expect(resolveMember('Сидорову', ctx).kind).toBe('none')
  })

  it('несколько совпадений → ambiguous с кандидатами', () => {
    const ambCtx = makeContext({
      lookup: {
        ...ctx.lookup,
        members: [
          { id: 'u1', name: 'Иван Иванов' },
          { id: 'u3', name: 'Иван Сидоров' },
        ],
      },
    })
    const r = resolveMember('Ивану', ambCtx)
    expect(r.kind).toBe('ambiguous')
    if (r.kind !== 'ambiguous') return
    expect(r.candidates.map((c) => c.id).sort()).toEqual(['u1', 'u3'])
  })

  it('никогда не выдумывает id (пустой ввод → none)', () => {
    expect(resolveMember('  ', ctx).kind).toBe('none')
  })
})

describe('resolveStatus', () => {
  const ctx = makeContext()

  it.each([
    ['готово', 4],
    ['сделано', 4],
    ['done', 4],
    ['в работе', 2],
    ['в процессе', 2],
    ['сделать', 1],
    ['to do', 1],
  ])('«%s» → статус #%s', (raw, id) => {
    const r = resolveStatus(raw, ctx)
    expect(r.kind).toBe('ok')
    if (r.kind !== 'ok') return
    expect(r.value.id).toBe(id)
  })

  it('статус, которого нет в проекте → none', () => {
    // в фикстуре нет Review
    expect(resolveStatus('на ревью', ctx).kind).toBe('none')
  })

  it('распознаёт Review/Canceled, если они есть в проекте', () => {
    const full: VoiceStatus[] = [
      { id: 1, code: 'To Do', label: 'To Do' },
      { id: 160, code: 'Review', label: 'REWIEW' },
      { id: 5, code: 'Canceled', label: 'Canceled' },
    ]
    const c = makeContext({ lookup: { ...ctx.lookup, statuses: full } })
    expect(resolveStatus('ревью', c)).toMatchObject({ kind: 'ok', value: { id: 160 } })
    expect(resolveStatus('отменить', c)).toMatchObject({ kind: 'ok', value: { id: 5 } })
  })

  it('мусор → none', () => {
    expect(resolveStatus('абракадабра', ctx).kind).toBe('none')
  })
})

describe('resolvePriority', () => {
  const ctx = makeContext()

  it.each([
    ['высокий', 'HIGH'],
    ['срочно', 'HIGH'],
    ['критичный', 'HIGH'],
    ['средний', 'MEDIUM'],
    ['низкий', 'LOW'],
    ['высокий приоритет', 'HIGH'],
  ])('«%s» → %s', (raw, value) => {
    const r = resolvePriority(raw, ctx)
    expect(r.kind).toBe('ok')
    if (r.kind !== 'ok') return
    expect(r.value.value).toBe(value)
  })

  it('мусор → none', () => {
    expect(resolvePriority('фиолетовый', ctx).kind).toBe('none')
  })
})

describe('resolveSprint', () => {
  const ctx = makeContext()

  it('«текущий/активный» → активный спринт', () => {
    expect(resolveSprint('в текущий спринт', ctx)).toMatchObject({
      kind: 'ok',
      value: { id: 's-active' },
    })
    expect(resolveSprint('активный', ctx)).toMatchObject({
      kind: 'ok',
      value: { id: 's-active' },
    })
  })

  it('«бэклог» → спринт по умолчанию', () => {
    expect(resolveSprint('бэклог', ctx)).toMatchObject({
      kind: 'ok',
      value: { id: 's-backlog' },
    })
  })

  it('по имени спринта', () => {
    expect(resolveSprint('Спринт 1', ctx)).toMatchObject({
      kind: 'ok',
      value: { id: 's-active' },
    })
  })

  it('неизвестный спринт → none', () => {
    expect(resolveSprint('спринт 99', ctx).kind).toBe('none')
  })
})

describe('resolveTaskRef', () => {
  it('«эту задачу» → открытая задача (если есть)', () => {
    const ctx = makeContext({
      openTask: { id: 't1', code: 'ТП-90', title: 'ADR' },
    })
    expect(resolveTaskRef('эту задачу', ctx)).toEqual({
      kind: 'ok',
      value: { kind: 'open', task: { id: 't1', code: 'ТП-90', title: 'ADR' } },
    })
  })

  it('«эту задачу» без открытой задачи → none', () => {
    expect(resolveTaskRef('эту задачу', makeContext()).kind).toBe('none')
  })

  it.each([
    ['ТП-90', 'ТП-90'],
    ['тп 90', 'ТП-90'],
    ['задачу WTP 12', 'WTP-12'],
  ])('код «%s» → %s', (raw, code) => {
    const r = resolveTaskRef(raw, makeContext())
    expect(r.kind).toBe('ok')
    if (r.kind !== 'ok' || r.value.kind !== 'code') throw new Error('ожидался code')
    expect(r.value.code).toBe(code)
  })

  it('нет ссылки → none', () => {
    expect(resolveTaskRef('просто текст', makeContext()).kind).toBe('none')
  })
})
