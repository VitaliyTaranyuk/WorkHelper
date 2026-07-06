import { describe, it, expect } from 'vitest'
import { prepareTaskCard, buildCreateTaskPayload } from '../prepareTaskCard'

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

  it('собирает DTO с авто-названием и не шлёт «Не назначен»', () => {
    const dto = buildCreateTaskPayload(base, 'p-1')
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

  it('передаёт исполнителя и опускает статус, когда его нет', () => {
    const dto = buildCreateTaskPayload(
      { ...base, assignee: 'user-9', status: null },
      'p-1',
    )
    expect(dto.assignee).toBe('user-9')
    expect('statusId' in dto).toBe(false)
  })
})
