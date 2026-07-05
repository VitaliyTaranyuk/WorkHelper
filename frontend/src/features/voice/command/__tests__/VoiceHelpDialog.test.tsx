import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { VoiceHelpDialog } from '../VoiceHelpDialog'

describe('VoiceHelpDialog (справочник)', () => {
  it('рендерит каталог возможностей и ограничения', () => {
    render(
      <VoiceHelpDialog
        open
        hotkey="ctrl+shift+m"
        onClose={vi.fn()}
        onStartOnboarding={vi.fn()}
      />,
    )
    expect(screen.getByText('Справочник голосового помощника')).toBeInTheDocument()
    expect(screen.getByText('Создание')).toBeInTheDocument()
    expect(screen.getByText('Ограничения текущей версии')).toBeInTheDocument()
    expect(screen.getAllByText(/Создай задачу/i).length).toBeGreaterThan(0)
  })

  it('«Пройти обучение» вызывает колбэк', () => {
    const onStart = vi.fn()
    render(
      <VoiceHelpDialog
        open
        hotkey="ctrl+shift+m"
        onClose={vi.fn()}
        onStartOnboarding={onStart}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Пройти обучение' }))
    expect(onStart).toHaveBeenCalled()
  })
})
