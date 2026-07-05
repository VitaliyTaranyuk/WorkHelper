import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { VoiceOnboarding } from '../VoiceOnboarding'
import { VoiceHelpDialog } from '../VoiceHelpDialog'
import { VOICE_ONBOARDING_STEPS } from '../voiceHelp'

describe('VoiceOnboarding', () => {
  it('показывает первый шаг и переключает «Далее»', () => {
    render(<VoiceOnboarding open onClose={vi.fn()} />)
    expect(screen.getByText(VOICE_ONBOARDING_STEPS[0].title)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Далее' }))
    expect(screen.getByText(VOICE_ONBOARDING_STEPS[1].title)).toBeInTheDocument()
  })

  it('«Пропустить» закрывает', () => {
    const onClose = vi.fn()
    render(<VoiceOnboarding open onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: 'Пропустить' }))
    expect(onClose).toHaveBeenCalled()
  })

  it('закрыт → не рендерит контент', () => {
    render(<VoiceOnboarding open={false} onClose={vi.fn()} />)
    expect(screen.queryByText(VOICE_ONBOARDING_STEPS[0].title)).not.toBeInTheDocument()
  })
})

describe('VoiceHelpDialog', () => {
  it('рендерит каталог возможностей и ограничения', () => {
    render(
      <VoiceHelpDialog
        open
        hotkey="ctrl+shift+m"
        onClose={vi.fn()}
        onStartOnboarding={vi.fn()}
      />,
    )
    expect(screen.getByText('Создание')).toBeInTheDocument()
    expect(screen.getByText('Ограничения текущей версии')).toBeInTheDocument()
    // хотя бы один пример-чип
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
