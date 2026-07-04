import { describe, it, expect } from 'vitest'
import { createRuleBasedResolver } from '../intentResolver'
import { commandRegistry } from '../../command/commands'
import { makeContext } from '../../command/__tests__/fixtures'

const resolver = createRuleBasedResolver(commandRegistry)
const ctx = makeContext()

describe('createRuleBasedResolver (реальный реестр)', () => {
  it('«Создай задачу купить хлеб» → task.create с content', async () => {
    const r = await resolver.resolve('Создай задачу купить хлеб', ctx)
    expect(r.commandId).toBe('task.create')
    expect(r.slots.content).toBe('купить хлеб')
    expect(r.confidence).toBeGreaterThan(0.5)
  })

  it.each([
    'Добавь задачу подготовить отчёт',
    'Заведи задачу починить логин',
    'Новая задача обновить документацию',
  ])('распознаёт создание: «%s»', async (phrase) => {
    const r = await resolver.resolve(phrase, ctx)
    expect(r.commandId).toBe('task.create')
    expect(r.slots.content.length).toBeGreaterThan(0)
  })

  it('«Открой доску» → app.navigate с target', async () => {
    const r = await resolver.resolve('Открой доску', ctx)
    expect(r.commandId).toBe('app.navigate')
    expect(r.slots.target).toContain('доску')
  })

  it('голый раздел «календарь» → app.navigate', async () => {
    const r = await resolver.resolve('календарь', ctx)
    expect(r.commandId).toBe('app.navigate')
  })

  it('первое совпадение по порядку реестра (create раньше navigate)', async () => {
    // «создай задачу открой доску» — триггер создания срабатывает первым
    const r = await resolver.resolve('Создай задачу открой доску', ctx)
    expect(r.commandId).toBe('task.create')
  })

  it('нераспознанное → commandId null', async () => {
    const r = await resolver.resolve('погода в москве', ctx)
    expect(r.commandId).toBeNull()
    expect(r.confidence).toBe(0)
  })

  it('пустой ввод → commandId null', async () => {
    expect((await resolver.resolve('   ', ctx)).commandId).toBeNull()
  })
})
