import { describe, it, expect } from 'vitest'
import {
  shouldShowUnsupportedHint,
  markUnsupportedHintShown,
} from '../unsupportedHint'

function memoryStorage(): Pick<Storage, 'getItem' | 'setItem'> & {
  data: Map<string, string>
} {
  const data = new Map<string, string>()
  return {
    data,
    getItem: (k: string) => (data.has(k) ? data.get(k)! : null),
    setItem: (k: string, v: string) => void data.set(k, v),
  }
}

describe('unsupportedHint (ТП-139, F-014)', () => {
  it('первый раз — показывать, после отметки — нет', () => {
    const s = memoryStorage()
    expect(shouldShowUnsupportedHint(s)).toBe(true)
    markUnsupportedHintShown(s)
    expect(shouldShowUnsupportedHint(s)).toBe(false)
  })

  it('отметка сохраняется как значение в storage (переживает сессии)', () => {
    const s = memoryStorage()
    markUnsupportedHintShown(s)
    expect(s.data.size).toBe(1)
  })

  it('недоступный storage — не показывать (не спамить каждый вход)', () => {
    const broken = {
      getItem: () => {
        throw new Error('denied')
      },
      setItem: () => {
        throw new Error('denied')
      },
    }
    expect(shouldShowUnsupportedHint(broken)).toBe(false)
    expect(() => markUnsupportedHintShown(broken)).not.toThrow()
  })
})
