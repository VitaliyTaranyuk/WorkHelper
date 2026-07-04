import { describe, it, expect } from 'vitest'
import { createHeuristicResolver } from '../heuristicResolver'
import { chainResolvers } from '../chainResolvers'
import { createRuleBasedResolver } from '../intentResolver'
import { commandRegistry } from '../../command/commands'
import { CONFIDENCE_CONFIRM_THRESHOLD } from '../../command/executor'
import { makeContext } from '../../command/__tests__/fixtures'

const heuristic = createHeuristicResolver(commandRegistry)
const ctx = makeContext()

describe('createHeuristicResolver', () => {
  it('ловит свободную формулировку создания, что пропускает rule', async () => {
    const r = await heuristic.resolve('надо бы задачу про квартальный отчёт', ctx)
    expect(r.commandId).toBe('task.create')
    expect(r.slots.content).toContain('отчёт')
  })

  it('со склонением («задачку») тоже распознаёт', async () => {
    const r = await heuristic.resolve('заведи задачку купить кофе', ctx)
    expect(r.commandId).toBe('task.create')
  })

  it('навигацию ловит по разделу', async () => {
    const r = await heuristic.resolve('слушай покажи календарь пожалуйста', ctx)
    expect(r.commandId).toBe('app.navigate')
  })

  it('уверенность ниже порога подтверждения (эвристику подтверждают)', async () => {
    const r = await heuristic.resolve('добавь задачу отчёт', ctx)
    expect(r.confidence).toBeLessThan(CONFIDENCE_CONFIRM_THRESHOLD)
  })

  it('нерелевантная фраза → null', async () => {
    expect((await heuristic.resolve('какая сегодня погода', ctx)).commandId).toBeNull()
  })
})

describe('chainResolvers (rule → эвристика)', () => {
  const chain = chainResolvers(
    createRuleBasedResolver(commandRegistry),
    heuristic,
  )

  it('точную фразу берёт rule (высокая уверенность)', async () => {
    const r = await chain.resolve('Создай задачу купить хлеб', ctx)
    expect(r.commandId).toBe('task.create')
    expect(r.confidence).toBeGreaterThanOrEqual(CONFIDENCE_CONFIRM_THRESHOLD)
  })

  it('свободную фразу берёт эвристика (низкая уверенность)', async () => {
    const r = await chain.resolve('мне нужна задачка про релиз', ctx)
    expect(r.commandId).toBe('task.create')
    expect(r.confidence).toBeLessThan(CONFIDENCE_CONFIRM_THRESHOLD)
  })

  it('никто не распознал → null', async () => {
    expect((await chain.resolve('расскажи анекдот', ctx)).commandId).toBeNull()
  })

  it('ступень с ошибкой не роняет цепочку', async () => {
    const boom = {
      resolve: () => Promise.reject(new Error('down')),
    }
    const chain2 = chainResolvers(boom, heuristic)
    const r = await chain2.resolve('добавь задачу отчёт', ctx)
    expect(r.commandId).toBe('task.create')
  })
})
