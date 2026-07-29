import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useSpeechRecognition } from '../useSpeechRecognition'
import { useLiveDictation } from '../useLiveDictation'
import {
  finalizeActiveDictation,
  isDictationActive,
} from '../activeDictation'

/**
 * ТП-241 — сессия live-диктовки.
 *
 * Три требования задачи, которые обязаны держаться постоянно:
 *  1. пауза в речи НЕ обрывает сессию (раньше обрывала, и длинная диктовка
 *     разваливалась на куски);
 *  2. явное завершение отдаёт текст СРАЗУ и вместе с недоговорённым хвостом
 *     (`interim`) — на этом держится «нажал Создать во время диктовки»;
 *  3. текст отдаётся ровно один раз: `onend` после явного завершения не должен
 *     вставить его повторно.
 */

vi.mock('@/shared/ui/notify', () => ({
  notify: { error: vi.fn(), success: vi.fn() },
}))

// Улучшение через DeepSeek здесь не проверяется (ТП-212) — мок отдаёт исходный
// текст, чтобы тест видел ровно то, что дала диктовка.
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
  stopped = false
  aborted = false
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
    this.stopped = true
    this.onend?.()
  }
  abort() {
    this.aborted = true
  }

  emit(chunks: Array<{ isFinal: boolean; text: string }>) {
    this.onresult?.({
      resultIndex: 0,
      results: chunks.map((c) => ({ isFinal: c.isFinal, 0: { transcript: c.text } })),
    })
  }
}

function installFakeRecognition() {
  FakeRecognition.instances = []
  ;(window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition =
    FakeRecognition
}

beforeEach(() => installFakeRecognition())
afterEach(() => {
  delete (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition
})

describe('useSpeechRecognition — сессия ТП-241', () => {
  it('keepAlive: пауза перезапускает распознавание, накопленное не теряется', () => {
    const onFinish = vi.fn()
    const { result } = renderHook(() =>
      useSpeechRecognition({ onFinish, keepAlive: true }),
    )

    act(() => result.current.start())
    const first = FakeRecognition.instances.at(-1)!
    act(() => first.emit([{ isFinal: true, text: 'первая мысль' }]))
    // Браузер сам закрыл распознавание по тишине
    act(() => first.onend?.())

    // Сессия продолжается новым экземпляром, текст не отдан
    expect(FakeRecognition.instances).toHaveLength(2)
    expect(onFinish).not.toHaveBeenCalled()

    const second = FakeRecognition.instances.at(-1)!
    act(() => second.emit([{ isFinal: true, text: 'вторая мысль' }]))
    act(() => {
      result.current.finish()
    })

    expect(onFinish).toHaveBeenCalledExactlyOnceWith('первая мысль вторая мысль')
  })

  it('finish отдаёт недоговорённый хвост (interim) вместе с финальным текстом', () => {
    const onFinish = vi.fn()
    const { result } = renderHook(() =>
      useSpeechRecognition({ onFinish, keepAlive: true }),
    )

    act(() => result.current.start())
    const rec = FakeRecognition.instances.at(-1)!
    act(() =>
      rec.emit([
        { isFinal: true, text: 'надиктованное' },
        { isFinal: false, text: 'ещё уточняется' },
      ]),
    )

    act(() => {
      result.current.finish()
    })

    expect(onFinish).toHaveBeenCalledExactlyOnceWith(
      'надиктованное ещё уточняется',
    )
  })

  it('после finish закрытие распознавания НЕ отдаёт текст повторно', () => {
    const onFinish = vi.fn()
    const { result } = renderHook(() =>
      useSpeechRecognition({ onFinish, keepAlive: true }),
    )

    act(() => result.current.start())
    const rec = FakeRecognition.instances.at(-1)!
    act(() => rec.emit([{ isFinal: true, text: 'текст' }]))
    act(() => {
      result.current.finish()
    })
    act(() => rec.onend?.())

    expect(onFinish).toHaveBeenCalledTimes(1)
  })
})

describe('useLiveDictation — управление сессией (ТП-241)', () => {
  it('живой текст разделён на распознанное и уточняемое', () => {
    const onText = vi.fn()
    const { result } = renderHook(() => useLiveDictation({ onText }))

    act(() => result.current.start())
    const rec = FakeRecognition.instances.at(-1)!
    act(() =>
      rec.emit([
        { isFinal: true, text: 'готовая часть' },
        { isFinal: false, text: 'уточняемая' },
      ]),
    )

    expect(result.current.listening).toBe(true)
    expect(result.current.liveFinal).toBe('готовая часть')
    expect(result.current.liveInterim).toBe('уточняемая')
    // В поле пока НИЧЕГО не ушло: вставка — только по завершении сессии
    expect(onText).not.toHaveBeenCalled()
  })

  it('Enter завершает сессию и вставляет текст в поле', async () => {
    const onText = vi.fn()
    const { result } = renderHook(() => useLiveDictation({ onText }))

    act(() => result.current.start())
    const rec = FakeRecognition.instances.at(-1)!
    act(() => rec.emit([{ isFinal: true, text: 'купить хлеб' }]))

    // await: после вставки локального текста конвейер идёт за улучшением
    // (ТП-212) и по возврату снимает флаг — иначе состояние обновится вне act.
    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))
    })

    expect(onText).toHaveBeenCalled()
    expect(onText.mock.calls[0]?.[0]).toContain('упить хлеб')
    expect(result.current.listening).toBe(false)
  })

  it('Shift+Enter сессию не завершает — это перенос строки', () => {
    const onText = vi.fn()
    const { result } = renderHook(() => useLiveDictation({ onText }))

    act(() => result.current.start())
    const rec = FakeRecognition.instances.at(-1)!
    act(() => rec.emit([{ isFinal: true, text: 'текст' }]))

    act(() => {
      window.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true }),
      )
    })

    expect(onText).not.toHaveBeenCalled()
    expect(result.current.listening).toBe(true)
  })

  it('Esc отменяет сессию — в поле ничего не попадает', () => {
    const onText = vi.fn()
    const { result } = renderHook(() => useLiveDictation({ onText }))

    act(() => result.current.start())
    const rec = FakeRecognition.instances.at(-1)!
    act(() => rec.emit([{ isFinal: true, text: 'черновик' }]))

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    })

    expect(onText).not.toHaveBeenCalled()
    expect(result.current.listening).toBe(false)
  })

  it('«Создать» во время диктовки: finalizeActiveDictation отдаёт текст в поле СРАЗУ', async () => {
    const onText = vi.fn()
    const { result, unmount } = renderHook(() => useLiveDictation({ onText }))

    act(() => result.current.start())
    const rec = FakeRecognition.instances.at(-1)!
    act(() =>
      rec.emit([
        { isFinal: true, text: 'починить доску' },
        { isFinal: false, text: 'и колонки' },
      ]),
    )

    expect(isDictationActive()).toBe(true)
    await act(async () => {
      await finalizeActiveDictation()
    })

    // Ключевой инвариант требования «нажал Создать, не нажимая Остановить»:
    // недоговорённый хвост тоже попал в поле.
    expect(onText).toHaveBeenCalledTimes(1)
    expect(onText.mock.calls[0]?.[0]).toContain('и колонки')

    unmount()
    expect(isDictationActive()).toBe(false)
  })

  it('без диктовки finalizeActiveDictation ничего не делает', async () => {
    expect(isDictationActive()).toBe(false)
    await expect(finalizeActiveDictation()).resolves.toBeUndefined()
  })
})
