import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useVoicePractice } from '../useVoicePractice'
import { useVoiceJournal } from '../../command/voiceJournal'
import { router } from '@/application/router'
import type { UseTourResult } from '../tour/useTour'
import type { PracticeStep } from '../practiceSteps'

vi.mock('@/application/router', () => ({
  router: { navigate: vi.fn() },
}))

function fakeTour(step: PracticeStep | null, active = true): UseTourResult {
  return {
    active,
    index: 0,
    step,
    isFirst: true,
    isLast: false,
    total: 1,
    start: vi.fn(),
    next: vi.fn(),
    prev: vi.fn(),
    skip: vi.fn(),
    stop: vi.fn(),
  }
}

beforeEach(() => {
  useVoiceJournal.getState().clear()
  vi.mocked(router.navigate).mockClear()
})

describe('useVoicePractice', () => {
  it('переводит шаг при новой команде, если шаг ждёт события', () => {
    const tour = fakeTour({ id: 's', title: '', body: '', waitForEvent: true })
    renderHook(() => useVoicePractice(tour))
    act(() =>
      useVoiceJournal.getState().add({ message: 'Готово', taskCode: 'ТП-1' }),
    )
    expect(tour.next).toHaveBeenCalledTimes(1)
  })

  it('учитывает expect: не переходит, пока условие не выполнено', () => {
    const tour = fakeTour({
      id: 'create',
      title: '',
      body: '',
      waitForEvent: true,
      expect: (e) => !!e.taskCode,
    })
    renderHook(() => useVoicePractice(tour))
    // команда без taskCode — не подходит
    act(() => useVoiceJournal.getState().add({ message: 'что-то' }))
    expect(tour.next).not.toHaveBeenCalled()
    // команда с taskCode — переход
    act(() =>
      useVoiceJournal.getState().add({ message: 'создал', taskCode: 'ТП-2' }),
    )
    expect(tour.next).toHaveBeenCalledTimes(1)
  })

  it('не переводит информационные шаги (без waitForEvent)', () => {
    const tour = fakeTour({ id: 'intro', title: '', body: '' })
    renderHook(() => useVoicePractice(tour))
    act(() => useVoiceJournal.getState().add({ message: 'x', taskCode: 'ТП-3' }))
    expect(tour.next).not.toHaveBeenCalled()
  })

  it('неактивный тур — игнорирует журнал', () => {
    const tour = fakeTour(
      { id: 's', title: '', body: '', waitForEvent: true },
      false,
    )
    renderHook(() => useVoicePractice(tour))
    act(() => useVoiceJournal.getState().add({ message: 'x', taskCode: 'ТП-4' }))
    expect(tour.next).not.toHaveBeenCalled()
  })

  it('существующие записи журнала не листают шаги при старте', () => {
    // запись появилась ДО практики
    useVoiceJournal.getState().add({ message: 'старая', taskCode: 'ТП-0' })
    const tour = fakeTour({ id: 's', title: '', body: '', waitForEvent: true })
    renderHook(() => useVoicePractice(tour))
    // без новых записей переходов нет
    expect(tour.next).not.toHaveBeenCalled()
  })

  it('opensCreatedTask открывает созданную задачу перед переходом', () => {
    const tour = fakeTour({
      id: 'create-task',
      title: '',
      body: '',
      waitForEvent: true,
      expect: (e) => !!e.taskCode,
      opensCreatedTask: true,
    })
    renderHook(() => useVoicePractice(tour))
    act(() =>
      useVoiceJournal.getState().add({ message: 'создал', taskCode: 'ТП-42' }),
    )
    expect(router.navigate).toHaveBeenCalledWith({
      to: '/task/$code',
      params: { code: 'ТП-42' },
    })
    expect(tour.next).toHaveBeenCalledTimes(1)
  })

  it('обычный шаг не навигирует', () => {
    const tour = fakeTour({ id: 'comment', title: '', body: '', waitForEvent: true })
    renderHook(() => useVoicePractice(tour))
    act(() =>
      useVoiceJournal.getState().add({ message: 'коммент', taskCode: 'ТП-42' }),
    )
    expect(router.navigate).not.toHaveBeenCalled()
    expect(tour.next).toHaveBeenCalledTimes(1)
  })
})
