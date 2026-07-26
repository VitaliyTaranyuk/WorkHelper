import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  prepareTaskCard,
  prepareTaskCardAsync,
  buildCreateTaskPayload,
} from '../prepareTaskCard'

// ТП-208: prepareTaskCardAsync/buildCreateTaskPayload пытаются улучшить
// авто-название через backend-прокси DeepSeek. Сеть не мокаем — мокаем сам
// enhanceTextSafe шпионом, чтобы проверить И контракт вызова (не трогает
// пользовательское название), И безопасный фолбэк по умолчанию.
// ТП-212: по умолчанию мок ведёт себя как реальный фолбэк — возвращает третий
// аргумент (локальный заголовок), а НЕ отправленный текст описания.
const { enhanceTextSafeMock } = vi.hoisted(() => ({
  enhanceTextSafeMock: vi.fn((source: string, _mode: string, fallback?: string) =>
    Promise.resolve(fallback ?? source),
  ),
}))
vi.mock('@/shared/text/enhanceText', () => ({
  enhanceTextSafe: enhanceTextSafeMock,
}))

describe('prepareTaskCard (ТП-147)', () => {
  it('название пользователя неприкосновенно (только trim)', () => {
    const r = prepareTaskCard({
      title: '  Моё название  ',
      description: 'Совсем другой текст описания.',
    })
    expect(r.title).toBe('Моё название')
    expect(r.description).toBe('Совсем другой текст описания.')
  })

  it('пустое название + описание → название из первой мысли, описание не тронуто', () => {
    const r = prepareTaskCard({
      title: '',
      description:
        'Починить выравнивание карточек на доске. Сейчас колонки разъезжаются при длинных названиях.',
    })
    // ТП-166 (V2 движка): императив «Починить» канонизируется в «Исправить»
    expect(r.title).toBe('Исправить выравнивание карточек на доске')
    expect(r.description).toBe(
      'Починить выравнивание карточек на доске. Сейчас колонки разъезжаются при длинных названиях.',
    )
  })

  it('всё пустое → пустое название (валидация формы не пропустит)', () => {
    expect(prepareTaskCard({ title: ' ', description: '' })).toEqual({
      title: '',
      description: '',
    })
  })

  it('длинная первая мысль режется по границе слова (≤80), «Нужно» срезано (ТП-153)', () => {
    const long =
      'Нужно очень тщательно проверить как ведёт себя система когда пользователь вводит чрезвычайно длинные описания без знаков препинания вообще'
    const { title } = prepareTaskCard({ title: '', description: long })
    expect(title.length).toBeLessThanOrEqual(80)
    // вводное «Нужно» не попадает в название (единый движок generateTaskTitle)
    expect(title.startsWith('Очень тщательно проверить')).toBe(true)
    expect(title.endsWith(' ')).toBe(false)
  })

  it('вопрос/восклицание — знак не тащится в название', () => {
    expect(
      prepareTaskCard({ title: '', description: 'Почему падает сборка? Разобраться.' })
        .title,
    ).toBe('Почему падает сборка')
  })
})

describe('prepareTaskCardAsync (ТП-208/ТП-212, улучшение авто-названия через DeepSeek)', () => {
  beforeEach(() => {
    enhanceTextSafeMock.mockClear()
    enhanceTextSafeMock.mockImplementation(
      (source: string, _mode: string, fallback?: string) =>
        Promise.resolve(fallback ?? source),
    )
  })

  it('название пользователя неприкосновенно — enhanceTextSafe не вызывается', async () => {
    const draft = await prepareTaskCardAsync({
      title: '  Моё название  ',
      description: 'Текст описания.',
    })
    expect(draft.title).toBe('Моё название')
    expect(enhanceTextSafeMock).not.toHaveBeenCalled()
  })

  it('ТП-212: модели отдаётся ПОЛНОЕ описание, а не обрезанный локальный заголовок', async () => {
    enhanceTextSafeMock.mockResolvedValueOnce('Исправить фильтры доски (DeepSeek)')
    const description = 'Проверить фильтры на доске. Подробности внутри.'

    const draft = await prepareTaskCardAsync({ title: '', description })

    expect(enhanceTextSafeMock).toHaveBeenCalledWith(
      description,
      'TITLE',
      'Проверить фильтры на доске',
    )
    expect(draft.title).toBe('Исправить фильтры доски (DeepSeek)')
    expect(draft.description).toBe(description)
  })

  it('ТП-212: при неудаче улучшения остаётся ЛОКАЛЬНЫЙ заголовок, а не текст описания', async () => {
    // Контракт enhanceTextSafe: при сбое возвращается третий аргумент (fallback).
    enhanceTextSafeMock.mockImplementationOnce(
      (source: string, _mode: string, fallback?: string) =>
        Promise.resolve(fallback ?? source),
    )

    const draft = await prepareTaskCardAsync({
      title: '',
      description: 'Проверить фильтры на доске. Подробности внутри.',
    })

    expect(draft.title).toBe('Проверить фильтры на доске')
  })

  it('всё пустое — улучшение не запускается (нечего улучшать)', async () => {
    const draft = await prepareTaskCardAsync({ title: '', description: '' })
    expect(draft).toEqual({ title: '', description: '' })
    expect(enhanceTextSafeMock).not.toHaveBeenCalled()
  })
})

describe('buildCreateTaskPayload (ТП-147, единый сервис создания)', () => {
  const base = {
    taskTitle: '',
    description: 'Проверить фильтры на доске. Подробности внутри.',
    priority: 'MEDIUM' as const,
    type: 'TASK' as const,
    assignee: '-1',
    sprint: 'sprint-1',
    status: 5,
  }

  it('собирает DTO с авто-названием и не шлёт «Не назначен»', async () => {
    const dto = await buildCreateTaskPayload(base, 'p-1')
    expect(dto).toEqual({
      title: 'Проверить фильтры на доске',
      projectId: 'p-1',
      priority: 'MEDIUM',
      taskType: 'TASK',
      sprintId: 'sprint-1',
      description: 'Проверить фильтры на доске. Подробности внутри.',
      statusId: 5,
    })
    expect('assignee' in dto).toBe(false)
  })

  it('передаёт исполнителя и опускает статус, когда его нет', async () => {
    const dto = await buildCreateTaskPayload(
      { ...base, assignee: 'user-9', status: null },
      'p-1',
    )
    expect(dto.assignee).toBe('user-9')
    expect('statusId' in dto).toBe(false)
  })
})
