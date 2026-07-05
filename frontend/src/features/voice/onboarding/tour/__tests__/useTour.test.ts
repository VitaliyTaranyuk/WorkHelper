import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useTour } from '../useTour'
import type { TourStep } from '../tourTypes'

const steps: TourStep[] = [
  { id: 'a', title: 'A', body: 'a' },
  { id: 'b', title: 'B', body: 'b' },
  { id: 'c', title: 'C', body: 'c' },
]

describe('useTour', () => {
  it('до старта неактивен, step=null', () => {
    const { result } = renderHook(() => useTour(steps))
    expect(result.current.active).toBe(false)
    expect(result.current.step).toBeNull()
  })

  it('start активирует первый шаг', () => {
    const { result } = renderHook(() => useTour(steps))
    act(() => result.current.start())
    expect(result.current.active).toBe(true)
    expect(result.current.step?.id).toBe('a')
    expect(result.current.isFirst).toBe(true)
    expect(result.current.isLast).toBe(false)
  })

  it('next продвигает по шагам', () => {
    const { result } = renderHook(() => useTour(steps))
    act(() => result.current.start())
    act(() => result.current.next())
    expect(result.current.step?.id).toBe('b')
    act(() => result.current.next())
    expect(result.current.step?.id).toBe('c')
    expect(result.current.isLast).toBe(true)
  })

  it('next на последнем шаге завершает и зовёт onFinish', () => {
    const onFinish = vi.fn()
    const { result } = renderHook(() => useTour(steps, { onFinish }))
    act(() => result.current.start(2))
    act(() => result.current.next())
    expect(result.current.active).toBe(false)
    expect(onFinish).toHaveBeenCalledTimes(1)
  })

  it('skip деактивирует и зовёт onSkip', () => {
    const onSkip = vi.fn()
    const { result } = renderHook(() => useTour(steps, { onSkip }))
    act(() => result.current.start())
    act(() => result.current.skip())
    expect(result.current.active).toBe(false)
    expect(onSkip).toHaveBeenCalledTimes(1)
  })

  it('prev не уходит ниже нуля', () => {
    const { result } = renderHook(() => useTour(steps))
    act(() => result.current.start())
    act(() => result.current.prev())
    expect(result.current.index).toBe(0)
  })

  it('start с индексом за границей клампится', () => {
    const { result } = renderHook(() => useTour(steps))
    act(() => result.current.start(99))
    expect(result.current.index).toBe(2)
  })

  it('пустой список шагов — start ничего не делает', () => {
    const { result } = renderHook(() => useTour([]))
    act(() => result.current.start())
    expect(result.current.active).toBe(false)
  })
})
