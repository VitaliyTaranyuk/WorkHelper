import { describe, it, expect, vi, beforeEach } from 'vitest'
import { executeVoiceAction, type VoiceActionHandlers } from '../voiceActionExecutor'
import type { TextFormatter } from '../textFormatter'

const { enhanceTextSafeMock } = vi.hoisted(() => ({
  enhanceTextSafeMock: vi.fn((local: string) => Promise.resolve(local)),
}))
vi.mock('@/shared/text/enhanceText', () => ({
  enhanceTextSafe: enhanceTextSafeMock,
}))

const formatter: TextFormatter = {
  formatDictation: (raw) => `formatted:${raw}`,
  toTaskDraft: (raw) => ({ title: `title:${raw}`, description: `desc:${raw}` }),
}

describe('executeVoiceAction (ТП-88 форматтер + ТП-208 улучшение через DeepSeek)', () => {
  beforeEach(() => {
    enhanceTextSafeMock.mockClear()
    enhanceTextSafeMock.mockImplementation((local: string) => Promise.resolve(local))
  })

  it('DICTATE_FIELD: форматирует локально, затем улучшает через enhanceTextSafe (mode DICTATION)', async () => {
    enhanceTextSafeMock.mockResolvedValueOnce('улучшенный текст')
    const handlers: VoiceActionHandlers = { onFieldText: vi.fn() }

    await executeVoiceAction(
      { type: 'DICTATE_FIELD', field: 'description' },
      'сырой текст',
      formatter,
      handlers,
    )

    expect(enhanceTextSafeMock).toHaveBeenCalledWith('formatted:сырой текст', 'DICTATION')
    expect(handlers.onFieldText).toHaveBeenCalledWith('description', 'улучшенный текст')
  })

  it('CREATE_TASK: черновик формируется локально, улучшается только title (mode TITLE)', async () => {
    enhanceTextSafeMock.mockResolvedValueOnce('Улучшенное название')
    const handlers: VoiceActionHandlers = { onTaskDraft: vi.fn() }

    await executeVoiceAction({ type: 'CREATE_TASK' }, 'создай задачу', formatter, handlers)

    expect(enhanceTextSafeMock).toHaveBeenCalledWith('title:создай задачу', 'TITLE')
    expect(handlers.onTaskDraft).toHaveBeenCalledWith({
      title: 'Улучшенное название',
      description: 'desc:создай задачу',
    })
  })

  it('CREATE_TASK: пустой title из форматтера — enhanceTextSafe не вызывается', async () => {
    const emptyTitleFormatter: TextFormatter = {
      ...formatter,
      toTaskDraft: () => ({ title: '' }),
    }
    const handlers: VoiceActionHandlers = { onTaskDraft: vi.fn() }

    await executeVoiceAction({ type: 'CREATE_TASK' }, 'текст', emptyTitleFormatter, handlers)

    expect(enhanceTextSafeMock).not.toHaveBeenCalled()
    expect(handlers.onTaskDraft).toHaveBeenCalledWith({ title: '' })
  })

  it('недоступность DeepSeek (enhanceTextSafe возвращает локальный текст) — поведение как в ТП-88', async () => {
    const handlers: VoiceActionHandlers = { onFieldText: vi.fn() }

    await executeVoiceAction(
      { type: 'DICTATE_FIELD', field: 'comment' },
      'сырой текст',
      formatter,
      handlers,
    )

    expect(handlers.onFieldText).toHaveBeenCalledWith('comment', 'formatted:сырой текст')
  })
})
