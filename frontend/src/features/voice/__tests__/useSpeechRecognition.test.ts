import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import {
  endsWithStopPhrase,
  stripStopPhrase,
  DEFAULT_STOP_PHRASE,
  useSpeechRecognition,
} from '../useSpeechRecognition'

describe('endsWithStopPhrase (ТП-111)', () => {
  it('распознаёт стоп-фразу в конце', () => {
    expect(endsWithStopPhrase('купить хлеб работаем', 'работаем')).toBe(true)
    expect(endsWithStopPhrase('всё готово Работаем', 'работаем')).toBe(true)
  })

  it('игнорирует пунктуацию и ё', () => {
    expect(endsWithStopPhrase('поехали, ёлки работаем.', 'работаем')).toBe(true)
  })

  it('не срабатывает на похожих словах', () => {
    expect(endsWithStopPhrase('система работает', 'работаем')).toBe(false)
    expect(endsWithStopPhrase('купить хлеб', 'работаем')).toBe(false)
  })

  it('стоп-фраза не в конце — не завершает', () => {
    expect(endsWithStopPhrase('работаем над задачей', 'работаем')).toBe(false)
  })

  it('поддерживает многословную фразу', () => {
    expect(endsWithStopPhrase('готово стоп запись', 'стоп запись')).toBe(true)
  })

  it('дефолтная стоп-фраза — «работаем»', () => {
    expect(DEFAULT_STOP_PHRASE).toBe('работаем')
  })
})

// ===== ТП-141: сохранение накопленной диктовки при ошибке распознавания =====

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

  emitFinal(text: string) {
    this.onresult?.({
      resultIndex: 0,
      results: [{ isFinal: true, 0: { transcript: text } }],
    })
  }
}

function installFakeRecognition() {
  FakeRecognition.instances = []
  ;(window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition =
    FakeRecognition
}

afterEach(() => {
  delete (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition
})

describe('useSpeechRecognition — ошибка после частичной диктовки (ТП-141)', () => {
  it('диктовка: network-ошибка отдаёт накопленный текст в onFinish', () => {
    installFakeRecognition()
    const onFinish = vi.fn()
    const { result } = renderHook(() => useSpeechRecognition({ onFinish }))

    act(() => result.current.start())
    const rec = FakeRecognition.instances.at(-1)!
    act(() => rec.emitFinal('купить хлеб и молоко'))
    act(() => rec.onerror?.({ error: 'network' }))

    expect(onFinish).toHaveBeenCalledExactlyOnceWith('купить хлеб и молоко')
    expect(result.current.status).toBe('error')
    expect(result.current.error).toMatch(/сервис распознавания/i)
  })

  it('диктовка: ошибка без накопленного текста onFinish не вызывает', () => {
    installFakeRecognition()
    const onFinish = vi.fn()
    const { result } = renderHook(() => useSpeechRecognition({ onFinish }))

    act(() => result.current.start())
    const rec = FakeRecognition.instances.at(-1)!
    act(() => rec.onerror?.({ error: 'network' }))

    expect(onFinish).not.toHaveBeenCalled()
  })

  it('командный режим (стоп-фраза): частичная фраза при ошибке НЕ исполняется', () => {
    installFakeRecognition()
    const onFinish = vi.fn()
    const { result } = renderHook(() =>
      useSpeechRecognition({ onFinish, stopPhrase: 'работаем' }),
    )

    act(() => result.current.start())
    const rec = FakeRecognition.instances.at(-1)!
    act(() => rec.emitFinal('создай задачу купить'))
    act(() => rec.onerror?.({ error: 'network' }))

    expect(onFinish).not.toHaveBeenCalled()
    expect(result.current.status).toBe('error')
  })

  it('cancel по-прежнему отбрасывает текст', () => {
    installFakeRecognition()
    const onFinish = vi.fn()
    const { result } = renderHook(() => useSpeechRecognition({ onFinish }))

    act(() => result.current.start())
    const rec = FakeRecognition.instances.at(-1)!
    act(() => rec.emitFinal('черновик'))
    act(() => result.current.cancel())

    expect(onFinish).not.toHaveBeenCalled()
    expect(result.current.transcript).toBe('')
  })
})

describe('stripStopPhrase (ТП-111)', () => {
  it('убирает завершающую стоп-фразу, сохраняя остальной текст', () => {
    expect(stripStopPhrase('Купить хлеб работаем', 'работаем')).toBe('Купить хлеб')
    expect(stripStopPhrase('Купить хлеб. Работаем', 'работаем')).toBe('Купить хлеб.')
  })

  it('только стоп-фраза → пусто', () => {
    expect(stripStopPhrase('Работаем', 'работаем')).toBe('')
  })

  it('нет стоп-фразы → текст без изменений', () => {
    expect(stripStopPhrase('Купить хлеб', 'работаем')).toBe('Купить хлеб')
  })

  it('убирает многословную фразу', () => {
    expect(stripStopPhrase('готово стоп запись', 'стоп запись')).toBe('готово')
  })
})
