import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TaskCardSkeleton } from '../TaskCardSkeleton'

/**
 * ТП-185 (skeleton-first): при загрузке карточки показывается каркас
 * раскладки, а не блокирующий спиннер — доступная метка загрузки на месте.
 */
describe('TaskCardSkeleton', () => {
  it('рендерит каркас карточки с доступной меткой загрузки', () => {
    render(<TaskCardSkeleton />)
    expect(
      screen.getByLabelText('Загрузка карточки задачи'),
    ).toBeInTheDocument()
  })
})
