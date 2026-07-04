import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { VoiceOverlay } from '../VoiceOverlay'
import type { VoicePhase, VoiceSession } from '../useVoiceCommandSession'

function makeSession(phase: VoicePhase): VoiceSession {
  return {
    supported: true,
    listening: phase.t === 'listening',
    interim: '',
    phase,
    ready: true,
    toggle: vi.fn(),
    confirm: vi.fn(),
    cancel: vi.fn(),
    reset: vi.fn(),
  }
}

describe('VoiceOverlay', () => {
  it('idle → ничего не рендерит', () => {
    const { container } = render(<VoiceOverlay session={makeSession({ t: 'idle' })} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('listening → «Слушаю…» + Стоп вызывает toggle', () => {
    const s = makeSession({ t: 'listening' })
    render(<VoiceOverlay session={s} />)
    expect(screen.getByText('Слушаю…')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Стоп' }))
    expect(s.toggle).toHaveBeenCalled()
  })

  it('processing → индикатор распознавания', () => {
    render(<VoiceOverlay session={makeSession({ t: 'processing' })} />)
    expect(screen.getByText(/Распознаю/)).toBeInTheDocument()
  })

  it('confirm → summary + Подтвердить/Отмена вызывают confirm/reset', () => {
    const s = makeSession({
      t: 'confirm',
      title: 'Сменить статус',
      summary: 'В статус «Готово»',
      riskLevel: 'confirm',
    })
    render(<VoiceOverlay session={s} />)
    expect(screen.getByText('Сменить статус')).toBeInTheDocument()
    expect(screen.getByText('В статус «Готово»')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Подтвердить' }))
    expect(s.confirm).toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Отмена' }))
    expect(s.reset).toHaveBeenCalled()
  })

  it('message done с taskCode → показывает результат и кнопку Открыть', () => {
    const s = makeSession({
      t: 'message',
      kind: 'done',
      text: 'Создана задача ТП-200',
      taskCode: 'ТП-200',
    })
    render(<VoiceOverlay session={s} />)
    expect(screen.getByText('Создана задача ТП-200')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Открыть' })).toBeInTheDocument()
  })

  it('message clarify → «Сказать снова» вызывает toggle', () => {
    const s = makeSession({
      t: 'message',
      kind: 'clarify',
      text: 'Не понял команду',
    })
    render(<VoiceOverlay session={s} />)
    expect(screen.getByText('Не понял команду')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Сказать снова' }))
    expect(s.toggle).toHaveBeenCalled()
  })

  it('message error → текст ошибки + закрытие вызывает reset', () => {
    const s = makeSession({
      t: 'message',
      kind: 'error',
      text: 'Нет доступа к микрофону',
    })
    render(<VoiceOverlay session={s} />)
    expect(screen.getByText('Нет доступа к микрофону')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Закрыть' }))
    expect(s.reset).toHaveBeenCalled()
  })
})
