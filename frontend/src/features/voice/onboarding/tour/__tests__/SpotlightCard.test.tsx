import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SpotlightCard } from '../SpotlightCard'
import type { TourStep } from '../tourTypes'

const step: TourStep = { id: 'x', title: 'Заголовок', body: 'Тело шага' }

function renderCard(overrides: Partial<Parameters<typeof SpotlightCard>[0]> = {}) {
  const props = {
    step,
    index: 1,
    total: 3,
    isFirst: false,
    isLast: false,
    onNext: vi.fn(),
    onPrev: vi.fn(),
    onSkip: vi.fn(),
    ...overrides,
  }
  render(<SpotlightCard {...props} />)
  return props
}

describe('SpotlightCard', () => {
  it('показывает заголовок и тело', () => {
    renderCard()
    expect(screen.getByText('Заголовок')).toBeInTheDocument()
    expect(screen.getByText('Тело шага')).toBeInTheDocument()
  })

  it('«Далее» и «Завершить обучение» вызывают колбэки (ТП-146)', () => {
    const p = renderCard()
    fireEvent.click(screen.getByRole('button', { name: 'Далее' }))
    expect(p.onNext).toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Завершить обучение' }))
    expect(p.onSkip).toHaveBeenCalled()
  })

  it('на say-шаге ровно одна кнопка со словом «пропустить» (ТП-146)', () => {
    renderCard({ step: { ...step, waitForEvent: true } })
    const skips = screen.getAllByRole('button', { name: /пропустить/i })
    expect(skips).toHaveLength(1)
    expect(skips[0]).toHaveTextContent('Пропустить шаг')
  })

  it('на первом шаге нет «Назад»', () => {
    renderCard({ isFirst: true })
    expect(screen.queryByRole('button', { name: 'Назад' })).not.toBeInTheDocument()
  })

  it('на последнем шаге кнопка «Готово»', () => {
    renderCard({ isLast: true })
    expect(screen.getByRole('button', { name: 'Готово' })).toBeInTheDocument()
  })

  it('waitForEvent прячет «Далее» и показывает подсказку', () => {
    renderCard({ step: { ...step, waitForEvent: true } })
    expect(screen.queryByRole('button', { name: 'Далее' })).not.toBeInTheDocument()
    expect(screen.getByText(/выполните действие голосом/i)).toBeInTheDocument()
  })
})
