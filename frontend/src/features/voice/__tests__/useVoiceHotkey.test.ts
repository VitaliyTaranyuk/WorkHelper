import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { act } from '@testing-library/react'
import { useVoiceHotkey, HOLD_THRESHOLD_MS } from '../useVoiceHotkey'

/**
 * ТП-155: жизненный цикл нажатия хоткея — onPress на keydown (без
 * автоповторов), onRelease(heldMs) на отпускании комбинации.
 */

function keyEvent(type: 'keydown' | 'keyup', overrides: Partial<KeyboardEvent> = {}) {
  const e = new KeyboardEvent(type, {
    code: 'KeyM',
    key: 'm',
    ctrlKey: true,
    shiftKey: true,
    bubbles: true,
    ...overrides,
  })
  window.dispatchEvent(e)
}

describe('useVoiceHotkey (ТП-155, push-to-talk)', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('keydown → onPress; keyup → onRelease с временем удержания', () => {
    const onPress = vi.fn()
    const onRelease = vi.fn()
    renderHook(() => useVoiceHotkey('ctrl+shift+m', onPress, onRelease))

    const t0 = performance.now()
    vi.spyOn(performance, 'now').mockReturnValue(t0)
    act(() => keyEvent('keydown'))
    expect(onPress).toHaveBeenCalledOnce()

    vi.spyOn(performance, 'now').mockReturnValue(t0 + 600)
    act(() => keyEvent('keyup', { ctrlKey: false, shiftKey: false }))
    expect(onRelease).toHaveBeenCalledOnce()
    expect(onRelease.mock.calls[0][0]).toBeGreaterThanOrEqual(HOLD_THRESHOLD_MS)
  })

  it('автоповторы удержания не дребезжат onPress', () => {
    const onPress = vi.fn()
    renderHook(() => useVoiceHotkey('ctrl+shift+m', onPress))

    act(() => {
      keyEvent('keydown')
      keyEvent('keydown', { repeat: true })
      keyEvent('keydown', { repeat: true })
    })
    expect(onPress).toHaveBeenCalledOnce()
  })

  it('короткое нажатие отдаёт heldMs меньше порога', () => {
    const onRelease = vi.fn()
    renderHook(() => useVoiceHotkey('ctrl+shift+m', vi.fn(), onRelease))

    const t0 = 1000
    vi.spyOn(performance, 'now').mockReturnValue(t0)
    act(() => keyEvent('keydown'))
    vi.spyOn(performance, 'now').mockReturnValue(t0 + 120)
    act(() => keyEvent('keyup', { ctrlKey: false, shiftKey: false }))

    expect(onRelease.mock.calls[0][0]).toBeLessThan(HOLD_THRESHOLD_MS)
  })

  it('отпускание модификатора (Ctrl) завершает удержание', () => {
    const onRelease = vi.fn()
    renderHook(() => useVoiceHotkey('ctrl+shift+m', vi.fn(), onRelease))

    act(() => keyEvent('keydown'))
    // отпущен Ctrl: e.ctrlKey уже false, главная клавиша ещё зажата
    act(() =>
      keyEvent('keyup', { code: 'ControlLeft', key: 'Control', ctrlKey: false }),
    )
    expect(onRelease).toHaveBeenCalledOnce()
  })

  it('чужая комбинация не срабатывает; ввод в поле игнорируется', () => {
    const onPress = vi.fn()
    renderHook(() => useVoiceHotkey('ctrl+shift+m', onPress))

    act(() => keyEvent('keydown', { code: 'KeyK', key: 'k' }))
    expect(onPress).not.toHaveBeenCalled()

    const input = document.createElement('input')
    document.body.appendChild(input)
    act(() => {
      input.dispatchEvent(
        new KeyboardEvent('keydown', {
          code: 'KeyM',
          key: 'm',
          ctrlKey: true,
          shiftKey: true,
          bubbles: true,
        }),
      )
    })
    expect(onPress).not.toHaveBeenCalled()
    input.remove()
  })

  it('blur с зажатой комбинацией — как отпускание (страховка)', () => {
    const onRelease = vi.fn()
    renderHook(() => useVoiceHotkey('ctrl+shift+m', vi.fn(), onRelease))

    act(() => keyEvent('keydown'))
    act(() => window.dispatchEvent(new Event('blur')))
    expect(onRelease).toHaveBeenCalledOnce()
  })
})
