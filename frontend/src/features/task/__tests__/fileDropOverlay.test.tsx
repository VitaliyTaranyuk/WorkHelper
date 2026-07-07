import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { FileDropOverlay } from '../FileDropOverlay'

/**
 * ТП-183: регресс наложения текста. Прежний оверлей имел полупрозрачный фон
 * (--wt-accent-soft, alpha 0.1/0.22) — контент блока просвечивал и текст
 * накладывался. Фон обязан включать непрозрачную подложку --wt-surface.
 */
describe('FileDropOverlay', () => {
  it('рендерит одну подпись поверх непрозрачной подложки', () => {
    render(<FileDropOverlay />)
    const label = screen.getAllByText('Отпустите файлы, чтобы прикрепить')
    expect(label).toHaveLength(1)

    const overlay = label[0].parentElement!
    const style = window.getComputedStyle(overlay)
    // Композиция «акцент поверх поверхности»: без --wt-surface фон снова
    // станет полупрозрачным и текст под оверлеем будет просвечивать.
    expect(style.background).toContain('var(--wt-surface)')
    expect(style.background).toContain('var(--wt-accent-soft)')
    // Оверлей не перехватывает drop-события зоны
    expect(style.pointerEvents).toBe('none')
  })
})
