import { describe, it, expect, vi, beforeEach } from 'vitest'
import { enhanceTextSafe } from '../enhanceText'

const { enhanceVoiceTextMock } = vi.hoisted(() => ({
  enhanceVoiceTextMock: vi.fn(),
}))
vi.mock('@/shared/api/endpoint', () => ({
  workTechApi: { voice: { enhanceVoiceText: enhanceVoiceTextMock } },
}))

/**
 * ТП-208: enhanceTextSafe ВСЕГДА резолвится к пригодному тексту — это
 * гарантия, на которой держится вся интеграция (голосовой ввод и
 * автоподстановка названия не должны зависеть от DeepSeek).
 */
describe('enhanceTextSafe (ТП-208)', () => {
  beforeEach(() => {
    enhanceVoiceTextMock.mockReset()
  })

  it('пустой локальный текст — запрос не отправляется', async () => {
    const result = await enhanceTextSafe('   ', 'DICTATION')
    expect(result).toBe('   ')
    expect(enhanceVoiceTextMock).not.toHaveBeenCalled()
  })

  it('backend вернул улучшенный текст — используется он', async () => {
    enhanceVoiceTextMock.mockResolvedValue({
      data: { text: 'Исправить баг с логином.', enhanced: true },
    })

    const result = await enhanceTextSafe('исправить баг с логином', 'DICTATION')

    expect(result).toBe('Исправить баг с логином.')
    expect(enhanceVoiceTextMock).toHaveBeenCalledWith(
      expect.objectContaining({ text: 'исправить баг с логином', mode: 'DICTATION' }),
    )
  })

  it('backend вернул enhanced=false (ключ не настроен) — фолбэк на локальный текст', async () => {
    enhanceVoiceTextMock.mockResolvedValue({
      data: { text: 'исправить баг с логином', enhanced: false },
    })

    const result = await enhanceTextSafe('исправить баг с логином', 'DICTATION')

    expect(result).toBe('исправить баг с логином')
  })

  it('сетевая ошибка — фолбэк на локальный текст, исключение не пробрасывается', async () => {
    enhanceVoiceTextMock.mockRejectedValue(new Error('network down'))

    const result = await enhanceTextSafe('Добавить фильтр', 'TITLE')

    expect(result).toBe('Добавить фильтр')
  })

  it('backend вернул пустую строку при enhanced=true — фолбэк на локальный текст', async () => {
    enhanceVoiceTextMock.mockResolvedValue({ data: { text: '   ', enhanced: true } })

    const result = await enhanceTextSafe('Добавить фильтр', 'TITLE')

    expect(result).toBe('Добавить фильтр')
  })
})
