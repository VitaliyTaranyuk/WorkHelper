import { describe, it, expect, vi, beforeEach } from 'vitest'
import { executeVoiceAction, type VoiceActionHandlers } from '../voiceActionExecutor'
import type { TextFormatter } from '../textFormatter'

const { enhanceTextSafeMock, enhanceTaskDraftSafeMock } = vi.hoisted(() => ({
  enhanceTextSafeMock: vi.fn((local: string) => Promise.resolve(local)),
  enhanceTaskDraftSafeMock: vi.fn((_source: string, fallback: unknown) =>
    Promise.resolve(fallback),
  ),
}))
vi.mock('@/shared/text/enhanceText', () => ({
  enhanceTextSafe: enhanceTextSafeMock,
  enhanceTaskDraftSafe: enhanceTaskDraftSafeMock,
}))

const formatter: TextFormatter = {
  formatDictation: (raw) => `formatted:${raw}`,
  toTaskDraft: (raw) => ({ title: `title:${raw}`, description: `desc:${raw}` }),
}

describe('executeVoiceAction (ТП-88 форматтер + ТП-212 неблокирующее улучшение)', () => {
  beforeEach(() => {
    enhanceTextSafeMock.mockClear()
    enhanceTextSafeMock.mockImplementation((local: string) => Promise.resolve(local))
    enhanceTaskDraftSafeMock.mockClear()
    enhanceTaskDraftSafeMock.mockImplementation((_source: string, fallback: unknown) =>
      Promise.resolve(fallback),
    )
  })

  it('DICTATE_FIELD: локальный текст отдаётся СРАЗУ, улучшенный — вторым вызовом с replaces', async () => {
    enhanceTextSafeMock.mockResolvedValueOnce('улучшенный текст')
    const handlers: VoiceActionHandlers = { onFieldText: vi.fn() }

    await executeVoiceAction(
      { type: 'DICTATE_FIELD', field: 'description' },
      'сырой текст',
      formatter,
      handlers,
    )

    expect(enhanceTextSafeMock).toHaveBeenCalledWith('formatted:сырой текст', 'DICTATION')
    expect(handlers.onFieldText).toHaveBeenNthCalledWith(
      1,
      'description',
      'formatted:сырой текст',
    )
    expect(handlers.onFieldText).toHaveBeenNthCalledWith(
      2,
      'description',
      'улучшенный текст',
      'formatted:сырой текст',
    )
  })

  it('ТП-212: локальная вставка происходит ДО ожидания сети (текст не может потеряться)', async () => {
    let resolveEnhance: (value: string) => void = () => {}
    enhanceTextSafeMock.mockReturnValueOnce(
      new Promise<string>((resolve) => {
        resolveEnhance = resolve
      }),
    )
    const onFieldText = vi.fn()

    const running = executeVoiceAction(
      { type: 'DICTATE_FIELD', field: 'description' },
      'сырой текст',
      formatter,
      { onFieldText },
    )

    // Сеть ещё не ответила, а текст уже в поле.
    await Promise.resolve()
    expect(onFieldText).toHaveBeenCalledTimes(1)
    expect(onFieldText).toHaveBeenCalledWith('description', 'formatted:сырой текст')

    resolveEnhance('улучшенный текст')
    await running
    expect(onFieldText).toHaveBeenCalledTimes(2)
  })

  it('улучшение не изменило текст — повторной вставки нет', async () => {
    const handlers: VoiceActionHandlers = { onFieldText: vi.fn() }

    await executeVoiceAction(
      { type: 'DICTATE_FIELD', field: 'comment' },
      'сырой текст',
      formatter,
      handlers,
    )

    expect(handlers.onFieldText).toHaveBeenCalledTimes(1)
    expect(handlers.onFieldText).toHaveBeenCalledWith('comment', 'formatted:сырой текст')
  })

  it('CREATE_TASK: локальный черновик сразу, затем улучшенный одним вызовом TASK_DRAFT', async () => {
    enhanceTaskDraftSafeMock.mockResolvedValueOnce({
      title: 'Улучшенное название',
      description: 'Улучшенное описание',
    })
    const onTaskDraft = vi.fn()

    await executeVoiceAction({ type: 'CREATE_TASK' }, 'создай задачу', formatter, {
      onTaskDraft,
    })

    expect(enhanceTaskDraftSafeMock).toHaveBeenCalledWith('создай задачу', {
      title: 'title:создай задачу',
      description: 'desc:создай задачу',
    })
    expect(onTaskDraft).toHaveBeenNthCalledWith(1, {
      title: 'title:создай задачу',
      description: 'desc:создай задачу',
    })
    expect(onTaskDraft).toHaveBeenNthCalledWith(2, {
      title: 'Улучшенное название',
      description: 'Улучшенное описание',
    })
  })

  it('CREATE_TASK: пустой title из форматтера — улучшение не запрашивается', async () => {
    const emptyTitleFormatter: TextFormatter = {
      ...formatter,
      toTaskDraft: () => ({ title: '' }),
    }
    const onTaskDraft = vi.fn()

    await executeVoiceAction({ type: 'CREATE_TASK' }, 'текст', emptyTitleFormatter, {
      onTaskDraft,
    })

    expect(enhanceTaskDraftSafeMock).not.toHaveBeenCalled()
    expect(onTaskDraft).toHaveBeenCalledTimes(1)
    expect(onTaskDraft).toHaveBeenCalledWith({ title: '' })
  })

  it('недоступность DeepSeek — поведение как в ТП-88 (остаётся локальный результат)', async () => {
    const handlers: VoiceActionHandlers = { onTaskDraft: vi.fn() }

    await executeVoiceAction({ type: 'CREATE_TASK' }, 'создай задачу', formatter, handlers)

    expect(handlers.onTaskDraft).toHaveBeenCalledTimes(1)
    expect(handlers.onTaskDraft).toHaveBeenCalledWith({
      title: 'title:создай задачу',
      description: 'desc:создай задачу',
    })
  })
})
