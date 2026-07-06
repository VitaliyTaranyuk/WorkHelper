import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { act } from '@testing-library/react'
import { matchVoiceAnswer, useVoiceAnswer } from '../useVoiceAnswer'

describe('matchVoiceAnswer (ТП-142)', () => {
  it('согласие: да/подтверждаю/выполняй и внутри реплики', () => {
    expect(matchVoiceAnswer('да')).toBe('yes')
    expect(matchVoiceAnswer('Да, выполняй')).toBe('yes')
    expect(matchVoiceAnswer('подтверждаю')).toBe('yes')
    expect(matchVoiceAnswer('ну давай')).toBe('yes')
  })

  it('отказ: нет/отмена/не надо', () => {
    expect(matchVoiceAnswer('нет')).toBe('no')
    expect(matchVoiceAnswer('отмена')).toBe('no')
    expect(matchVoiceAnswer('не надо')).toBe('no')
  })

  it('отказ важнее согласия в одной реплике', () => {
    expect(matchVoiceAnswer('да нет, отмени')).toBe('no')
  })

  it('посторонняя речь — null (не путать «данные» с «да»)', () => {
    expect(matchVoiceAnswer('данные загружаются')).toBe(null)
    expect(matchVoiceAnswer('нетрудно повторить')).toBe(null)
    expect(matchVoiceAnswer('')).toBe(null)
  })

  it('пунктуация и ё не мешают', () => {
    expect(matchVoiceAnswer('Да!')).toBe('yes')
    expect(matchVoiceAnswer('отмени, пожалуйста')).toBe('no')
  })
})

// ===== hook: слушатель активен только при active, отдаёт первый ответ =====

type Handler<T> = ((e: T) => void) | null

class FakeRecognition {
  static instances: FakeRecognition[] = []
  lang = ''
  continuous = false
  interimResults = false
  aborted = false
  onresult: Handler<{
    resultIndex: number
    results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>
  }> = null
  onend: (() => void) | null = null
  onerror: Handler<{ error: string }> = null
  start() {
    FakeRecognition.instances.push(this)
  }
  abort() {
    this.aborted = true
  }
  say(text: string) {
    this.onresult?.({
      resultIndex: 0,
      results: [{ isFinal: false, 0: { transcript: text } }],
    })
  }
}

function install() {
  FakeRecognition.instances = []
  ;(window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition =
    FakeRecognition
}

afterEach(() => {
  delete (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition
})

describe('useVoiceAnswer (ТП-142)', () => {
  it('active: слушает, «да» → onAnswer(yes) и стоп', () => {
    install()
    const onAnswer = vi.fn()
    renderHook(() => useVoiceAnswer({ active: true, onAnswer }))

    const rec = FakeRecognition.instances.at(-1)!
    act(() => rec.say('да'))

    expect(onAnswer).toHaveBeenCalledExactlyOnceWith('yes')
    expect(rec.aborted).toBe(true)
  })

  it('«отмена» → onAnswer(no)', () => {
    install()
    const onAnswer = vi.fn()
    renderHook(() => useVoiceAnswer({ active: true, onAnswer }))
    act(() => FakeRecognition.instances.at(-1)!.say('нет, отмена'))
    expect(onAnswer).toHaveBeenCalledExactlyOnceWith('no')
  })

  it('посторонняя речь не отвечает; пауза перезапускает слушатель', () => {
    install()
    const onAnswer = vi.fn()
    renderHook(() => useVoiceAnswer({ active: true, onAnswer }))
    const first = FakeRecognition.instances.at(-1)!
    act(() => first.say('какая-то речь'))
    expect(onAnswer).not.toHaveBeenCalled()
    act(() => first.onend?.())
    expect(FakeRecognition.instances.length).toBe(2) // перезапустился
  })

  it('not active: не слушает; деактивация останавливает', () => {
    install()
    const onAnswer = vi.fn()
    const { rerender } = renderHook(
      ({ active }: { active: boolean }) => useVoiceAnswer({ active, onAnswer }),
      { initialProps: { active: false } },
    )
    expect(FakeRecognition.instances.length).toBe(0)

    rerender({ active: true })
    expect(FakeRecognition.instances.length).toBe(1)

    rerender({ active: false })
    expect(FakeRecognition.instances.at(-1)!.aborted).toBe(true)
  })
})
