import { describe, it, expect, vi, beforeEach } from 'vitest'
import { enhanceTaskDraftSafe, enhanceTextSafe } from '../enhanceText'

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

  it('ТП-212: отправляется source, а фолбэком служит отдельный аргумент', async () => {
    enhanceVoiceTextMock.mockRejectedValue(new Error('timeout'))

    const result = await enhanceTextSafe(
      'Длинное описание задачи, которое уходит модели.',
      'TITLE',
      'Локальный заголовок',
    )

    // При сбое пользователь получает локальный заголовок, а НЕ текст описания.
    expect(result).toBe('Локальный заголовок')
    expect(enhanceVoiceTextMock).toHaveBeenCalledWith(
      expect.objectContaining({ text: 'Длинное описание задачи, которое уходит модели.' }),
    )
  })
})

/**
 * ТП-212: TASK_DRAFT — название и описание одним вызовом (голосовое создание
 * задачи). Частичный результат не принимается: локальный черновик целостен,
 * подменять его половиной ответа модели нельзя.
 */
describe('enhanceTaskDraftSafe (ТП-212)', () => {
  const local = { title: 'Починить логин', description: 'починить логин на проде' }

  beforeEach(() => {
    enhanceVoiceTextMock.mockReset()
  })

  it('пустой исходный текст — запрос не отправляется', async () => {
    const result = await enhanceTaskDraftSafe('  ', local)
    expect(result).toBe(local)
    expect(enhanceVoiceTextMock).not.toHaveBeenCalled()
  })

  it('полный ответ модели — используется он, режим TASK_DRAFT', async () => {
    enhanceVoiceTextMock.mockResolvedValue({
      data: {
        text: 'Починить логин на проде.',
        enhanced: true,
        title: 'Исправить вход в систему на проде',
        description: 'Починить логин на проде.',
      },
    })

    const result = await enhanceTaskDraftSafe('починить логин на проде', local)

    expect(enhanceVoiceTextMock).toHaveBeenCalledWith(
      expect.objectContaining({ mode: 'TASK_DRAFT' }),
    )
    expect(result).toEqual({
      title: 'Исправить вход в систему на проде',
      description: 'Починить логин на проде.',
    })
  })

  it('модель не смогла сформулировать название — остаётся локальное', async () => {
    enhanceVoiceTextMock.mockResolvedValue({
      data: {
        text: 'Починить логин.',
        enhanced: true,
        title: '',
        description: 'Починить логин.',
      },
    })

    const result = await enhanceTaskDraftSafe('починить логин', local)

    expect(result).toEqual({ title: 'Починить логин', description: 'Починить логин.' })
  })

  it('описание не пришло — черновик целиком остаётся локальным', async () => {
    enhanceVoiceTextMock.mockResolvedValue({
      data: { text: '', enhanced: true, title: 'Что-то', description: '  ' },
    })

    expect(await enhanceTaskDraftSafe('починить логин', local)).toBe(local)
  })

  it('enhanced=false (ключ не настроен) — локальный черновик без изменений', async () => {
    enhanceVoiceTextMock.mockResolvedValue({
      data: { text: 'починить логин на проде', enhanced: false },
    })

    expect(await enhanceTaskDraftSafe('починить логин на проде', local)).toBe(local)
  })

  it('сетевая ошибка — локальный черновик, исключение не пробрасывается', async () => {
    enhanceVoiceTextMock.mockRejectedValue(new Error('network down'))

    expect(await enhanceTaskDraftSafe('починить логин на проде', local)).toBe(local)
  })
})
