import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useVoiceJournal } from '../voiceJournal'

describe('useVoiceJournal', () => {
  beforeEach(() => useVoiceJournal.getState().clear())

  it('добавляет запись в начало', () => {
    const { add } = useVoiceJournal.getState()
    add({ message: 'первое' })
    add({ message: 'второе' })
    const entries = useVoiceJournal.getState().entries
    expect(entries.map((e) => e.message)).toEqual(['второе', 'первое'])
    expect(entries[0].id).toBeTruthy()
    expect(entries[0].at).toBeGreaterThan(0)
  })

  it('markUndone помечает запись и убирает undo', async () => {
    const undo = vi.fn(async () => {})
    useVoiceJournal.getState().add({ message: 'смена статуса', undo })
    const id = useVoiceJournal.getState().entries[0].id
    useVoiceJournal.getState().markUndone(id)
    const entry = useVoiceJournal.getState().entries[0]
    expect(entry.undone).toBe(true)
    expect(entry.undo).toBeUndefined()
  })

  it('ограничивает размер журнала', () => {
    const { add } = useVoiceJournal.getState()
    for (let i = 0; i < 40; i++) add({ message: `#${i}` })
    expect(useVoiceJournal.getState().entries.length).toBeLessThanOrEqual(25)
  })

  it('clear очищает', () => {
    useVoiceJournal.getState().add({ message: 'x' })
    useVoiceJournal.getState().clear()
    expect(useVoiceJournal.getState().entries).toHaveLength(0)
  })
})
