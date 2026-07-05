import { describe, it, expect } from 'vitest'
import { getUserInitials, formatUserName } from '../utils'

describe('getUserInitials (ТП-106 — единообразие)', () => {
  it('один пользователь: с displayName и без → одинаковые инициалы', () => {
    // шапка: есть displayName; карточка: только имя/фамилия — один человек
    const header = {
      firstName: 'Claude',
      lastName: 'Code',
      displayName: 'Admin',
    }
    const card = { firstName: 'Claude', lastName: 'Code', email: 'cc@mail.ru' }
    expect(getUserInitials(header)).toBe('CC')
    expect(getUserInitials(card)).toBe('CC')
    expect(getUserInitials(header)).toBe(getUserInitials(card))
  })

  it('имя+фамилия → первая буква фамилии и имени', () => {
    expect(getUserInitials({ firstName: 'Иван', lastName: 'Петров' })).toBe('ПИ')
  })

  it('только фамилия / только имя', () => {
    expect(getUserInitials({ lastName: 'Сидоров' })).toBe('СИ')
    expect(getUserInitials({ firstName: 'Анна' })).toBe('АН')
  })

  it('displayName — запасной вариант при отсутствии имён', () => {
    expect(getUserInitials({ displayName: 'Иван Петров' })).toBe('ИП')
    expect(getUserInitials({ displayName: 'Admin' })).toBe('AD')
  })

  it('email — последний фолбэк', () => {
    expect(getUserInitials({ email: 'test@mail.ru' })).toBe('TE')
  })

  it('пусто → «?»', () => {
    expect(getUserInitials(null)).toBe('?')
    expect(getUserInitials({})).toBe('?')
  })
})

describe('formatUserName (без регрессии)', () => {
  it('displayName приоритетнее для полного имени', () => {
    expect(
      formatUserName({ firstName: 'Claude', lastName: 'Code', displayName: 'Admin' }),
    ).toBe('Admin')
  })

  it('фамилия + имя, если нет displayName', () => {
    expect(formatUserName({ firstName: 'Иван', lastName: 'Петров' })).toBe(
      'Петров Иван',
    )
  })
})
