import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { useForm } from 'react-hook-form'
import { TaskDescriptionField } from '../TaskDescriptionField'
import type { FormValues } from '../TaskForm/useTaskForm'

/**
 * ТП-241 — постоянный репродьюсер жалобы «непонятно, идёт диктовка или нет».
 *
 * Требование задачи: наговоренное видно ПО ХОДУ речи, а уточняемый фрагмент
 * отличается от уже распознанного. Тест закрепляет обе части: панель живой
 * расшифровки появляется только во время записи и показывает оба фрагмента.
 */

vi.mock('@/shared/ui/notify', () => ({
  notify: { error: vi.fn(), success: vi.fn() },
}))

vi.mock('@/shared/text/enhanceText', () => ({
  enhanceTextSafe: vi.fn((source: string) => Promise.resolve(source)),
  enhanceTaskDraftSafe: vi.fn(),
  BACKGROUND_TIMEOUT_MS: 30_000,
}))

type Handler<T> = ((e: T) => void) | null

class FakeRecognition {
  static instances: FakeRecognition[] = []
  lang = ''
  continuous = false
  interimResults = false
  onresult: Handler<{
    resultIndex: number
    results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>
  }> = null
  onerror: Handler<{ error: string }> = null
  onend: (() => void) | null = null
  start() {
    FakeRecognition.instances.push(this)
  }
  stop() {
    this.onend?.()
  }
  abort() {}
  emit(chunks: Array<{ isFinal: boolean; text: string }>) {
    this.onresult?.({
      resultIndex: 0,
      results: chunks.map((c) => ({ isFinal: c.isFinal, 0: { transcript: c.text } })),
    })
  }
}

beforeEach(() => {
  FakeRecognition.instances = []
  ;(window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition =
    FakeRecognition
})
afterEach(() => {
  delete (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition
})

function Harness() {
  const form = useForm<FormValues>({ defaultValues: { description: '' } })
  return <TaskDescriptionField form={form} />
}

describe('Описание · живая расшифровка (ТП-241)', () => {
  it('до записи панели нет — пустая рамка под каждым полем была бы мёртвым UI', () => {
    render(<Harness />)
    expect(screen.queryByLabelText('Идёт диктовка')).not.toBeInTheDocument()
  })

  it('во время записи видно распознанное и отдельно — уточняемое', async () => {
    render(<Harness />)

    await act(async () => {
      screen.getByLabelText('Надиктовать голосом').click()
    })
    const rec = FakeRecognition.instances.at(-1)!
    act(() =>
      rec.emit([
        { isFinal: true, text: 'починить доску' },
        { isFinal: false, text: 'и колонки' },
      ]),
    )

    const panel = screen.getByLabelText('Идёт диктовка')
    expect(panel).toBeInTheDocument()
    expect(panel).toHaveTextContent('починить доску')
    expect(panel).toHaveTextContent('и колонки')
    // Кнопка перешла в состояние «идёт запись»
    expect(screen.getByLabelText('Закончить диктовку')).toBeInTheDocument()
    // В само поле пока ничего не вставлено — вставка по завершении сессии
    expect(
      screen.getByPlaceholderText<HTMLTextAreaElement>(/Опишите задачу/).value,
    ).toBe('')
  })

  it('Enter заканчивает сессию: текст уходит в поле, панель исчезает', async () => {
    render(<Harness />)

    await act(async () => {
      screen.getByLabelText('Надиктовать голосом').click()
    })
    const rec = FakeRecognition.instances.at(-1)!
    act(() => rec.emit([{ isFinal: true, text: 'починить доску' }]))

    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))
    })

    expect(screen.queryByLabelText('Идёт диктовка')).not.toBeInTheDocument()
    expect(
      screen.getByPlaceholderText<HTMLTextAreaElement>(/Опишите задачу/).value,
    ).toMatch(/очинить доску/)
  })
})
