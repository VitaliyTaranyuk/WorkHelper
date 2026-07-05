import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { VoiceOnboardingFlow } from '../VoiceOnboardingFlow'
import { getProgress, resetProgress } from '../onboardingProgress'

beforeEach(() => {
  resetProgress()
})

describe('VoiceOnboardingFlow', () => {
  it('закрыт → ничего не рендерит', () => {
    render(<VoiceOnboardingFlow open={false} onExit={vi.fn()} />)
    expect(
      screen.queryByText('Голосовое управление WorkTask'),
    ).not.toBeInTheDocument()
  })

  it('приветствие показывает три варианта', () => {
    render(<VoiceOnboardingFlow open onExit={vi.fn()} />)
    expect(screen.getByText('Голосовое управление WorkTask')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Начать обучение' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Позже' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Пропустить' })).toBeInTheDocument()
  })

  it('«Позже» помечает later и закрывает', () => {
    const onExit = vi.fn()
    render(<VoiceOnboardingFlow open onExit={onExit} />)
    fireEvent.click(screen.getByRole('button', { name: 'Позже' }))
    expect(getProgress().status).toBe('later')
    expect(onExit).toHaveBeenCalled()
  })

  it('«Пропустить» помечает skipped и закрывает', () => {
    const onExit = vi.fn()
    render(<VoiceOnboardingFlow open onExit={onExit} />)
    fireEvent.click(screen.getByRole('button', { name: 'Пропустить' }))
    expect(getProgress().status).toBe('skipped')
    expect(onExit).toHaveBeenCalled()
  })

  it('«Начать обучение» переводит к проверке микрофона и ставит in_progress', () => {
    render(<VoiceOnboardingFlow open onExit={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Начать обучение' }))
    expect(screen.getByText('Проверка микрофона')).toBeInTheDocument()
    const p = getProgress()
    expect(p.status).toBe('in_progress')
    expect(p.stage).toBe('hardware')
  })
})
