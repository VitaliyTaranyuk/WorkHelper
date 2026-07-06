import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ErrorBoundary } from '../ErrorBoundary'

/**
 * ТП-172 (T1): краш дочернего компонента = fallback c восстановлением,
 * а не белый экран. Ошибка уходит в console.error (шов мониторинга T5).
 */

function Bomb({ exploded }: { exploded: boolean }) {
  if (exploded) throw new Error('искусственный краш компонента')
  return <div>живой контент</div>
}

describe('ErrorBoundary', () => {
  it('исключение ребёнка показывает fallback, ошибка залогирована', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    render(
      <ErrorBoundary areaLabel="карточку задачи">
        <Bomb exploded />
      </ErrorBoundary>,
    )
    expect(
      screen.getByText(/Не удалось отобразить карточку задачи/),
    ).toBeTruthy()
    expect(screen.getByText(/Попробовать снова/)).toBeTruthy()
    expect(
      errorSpy.mock.calls.some((call) => String(call[0]).includes('[ErrorBoundary]')),
    ).toBe(true)
    errorSpy.mockRestore()
  })

  it('без ошибки рендерит детей как есть', () => {
    render(
      <ErrorBoundary>
        <Bomb exploded={false} />
      </ErrorBoundary>,
    )
    expect(screen.getByText('живой контент')).toBeTruthy()
  })

  it('«Попробовать снова» сбрасывает ошибку и зовёт onReset', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const onReset = vi.fn()
    render(
      <ErrorBoundary onReset={onReset}>
        <Bomb exploded />
      </ErrorBoundary>,
    )
    fireEvent.click(screen.getByText('Попробовать снова'))
    expect(onReset).toHaveBeenCalledTimes(1)
    errorSpy.mockRestore()
  })
})
