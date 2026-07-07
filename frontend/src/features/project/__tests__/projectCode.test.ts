import { describe, expect, it } from 'vitest'
import {
  deriveProjectCode,
  isValidProjectCode,
  normalizeProjectCodeInput,
} from '../projectCode'

/**
 * ТП-190: автогенерация кода из названия + маска формата (2–6, с буквы,
 * латиница/кириллица + цифры). Практика Jira/Linear.
 */
describe('deriveProjectCode', () => {
  it('инициалы для нескольких слов (в т.ч. кириллица)', () => {
    expect(deriveProjectCode('Тестовый проект')).toBe('ТП')
    expect(deriveProjectCode('Work Task')).toBe('WT')
    expect(deriveProjectCode('Проект 1')).toBe('П1')
  })
  it('первые буквы единственного слова', () => {
    expect(deriveProjectCode('WorkTask')).toBe('WOR')
  })
  it('пустое название → пустой код', () => {
    expect(deriveProjectCode('   ')).toBe('')
  })
  it('длина не превышает 6', () => {
    expect(deriveProjectCode('Alpha Beta Gamma Delta Epsilon Zeta Eta').length).toBeLessThanOrEqual(6)
  })
})

describe('isValidProjectCode', () => {
  it('валидные коды', () => {
    for (const c of ['ТП', 'WT', 'WOR', 'П1', 'ABC123', 'Кб2'])
      expect(isValidProjectCode(c)).toBe(true)
  })
  it('невалидные: короткий/длинный/с цифры/со спецсимволом', () => {
    for (const c of ['A', '', '1AB', 'AB-1', 'ABCDEFG', 'A B'])
      expect(isValidProjectCode(c)).toBe(false)
  })
})

describe('normalizeProjectCodeInput', () => {
  it('отбрасывает недопустимые символы, поднимает регистр, режет по 6', () => {
    expect(normalizeProjectCodeInput('wt-01')).toBe('WT01')
    expect(normalizeProjectCodeInput('тп 12')).toBe('ТП12')
    expect(normalizeProjectCodeInput('abcdefghij')).toBe('ABCDEF')
  })
})
