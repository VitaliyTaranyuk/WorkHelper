import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { MicCheckStep, CALIBRATION_PHRASE } from '../MicCheckStep'

// Управляемые моки хуков — проверяем ветвление шага без реального Web Audio/Speech.
const micMock = {
  supported: true,
  active: false,
  permission: 'granted' as const,
  level: 0,
  peak: 0,
  signalDetected: false,
  error: null as string | null,
  start: vi.fn(),
  stop: vi.fn(),
}

let capturedOnFinish: ((t: string) => void) | null = null
const speechMock = {
  supported: true,
  status: 'idle' as const,
  transcript: '',
  interim: '',
  error: null as string | null,
  start: vi.fn(),
  stop: vi.fn(),
  cancel: vi.fn(),
}

vi.mock('../useMicCheck', () => ({ useMicCheck: () => micMock }))
vi.mock('../../useSpeechRecognition', () => ({
  useSpeechRecognition: (opts: { onFinish: (t: string) => void }) => {
    capturedOnFinish = opts.onFinish
    return speechMock
  },
}))

function reset() {
  Object.assign(micMock, {
    supported: true, active: false, permission: 'granted', level: 0, peak: 0,
    signalDetected: false, error: null,
  })
  Object.assign(speechMock, {
    supported: true, status: 'idle', transcript: '', interim: '', error: null,
  })
  micMock.start.mockClear()
  micMock.stop.mockClear()
  speechMock.start.mockClear()
  speechMock.stop.mockClear()
}

beforeEach(reset)

describe('MicCheckStep', () => {
  it('неподдерживаемый браузер → предупреждение и «продолжить без проверки»', () => {
    speechMock.supported = false
    const onSkip = vi.fn()
    render(<MicCheckStep onComplete={vi.fn()} onSkip={onSkip} />)
    expect(screen.getByText(/недоступн/i)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /без проверки/i }))
    expect(onSkip).toHaveBeenCalled()
  })

  it('idle показывает фразу и запускает проверку', () => {
    render(<MicCheckStep onComplete={vi.fn()} />)
    expect(screen.getAllByText(new RegExp(CALIBRATION_PHRASE)).length).toBeGreaterThan(0)
    fireEvent.click(screen.getByRole('button', { name: 'Проверить микрофон' }))
    expect(micMock.start).toHaveBeenCalled()
    expect(speechMock.start).toHaveBeenCalled()
    // фаза checking: индикатор уровня + подсказка ждать сигнал
    expect(screen.getByRole('meter')).toBeInTheDocument()
  })

  it('во время проверки показывает распознаваемый текст и наличие сигнала', () => {
    speechMock.transcript = 'сегодня я тестирую'
    micMock.signalDetected = true
    render(<MicCheckStep onComplete={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Проверить микрофон' }))
    expect(screen.getByText('сегодня я тестирую')).toBeInTheDocument()
    expect(screen.getByText(/микрофон вас слышит/i)).toBeInTheDocument()
  })

  it('завершение с хорошим пиком → успех и «Далее» отдаёт ok=true', () => {
    micMock.peak = 0.5
    const onComplete = vi.fn()
    render(<MicCheckStep onComplete={onComplete} />)
    fireEvent.click(screen.getByRole('button', { name: 'Проверить микрофон' }))
    act(() => capturedOnFinish?.('сегодня я тестирую голосового помощника'))
    expect(micMock.stop).toHaveBeenCalled()
    expect(screen.getByText(/хорошо слышит/i)).toBeInTheDocument()
    expect(
      screen.getByText('сегодня я тестирую голосового помощника'),
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Далее' }))
    expect(onComplete).toHaveBeenCalledWith(true)
  })

  it('завершение без сигнала → ошибка-рекомендация, ok=false', () => {
    micMock.peak = 0.02
    const onComplete = vi.fn()
    render(<MicCheckStep onComplete={onComplete} />)
    fireEvent.click(screen.getByRole('button', { name: 'Проверить микрофон' }))
    act(() => capturedOnFinish?.(''))
    expect(screen.getByText(/почти не слышен/i)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Далее' }))
    expect(onComplete).toHaveBeenCalledWith(false)
  })
})
