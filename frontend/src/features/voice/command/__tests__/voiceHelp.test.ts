import { describe, it, expect } from 'vitest'
import { voiceHelpCatalog, voiceHelpItems } from '../voiceHelp'
import { commandRegistry } from '../../core/command/commands'

describe('voiceHelpCatalog', () => {
  it('покрывает все команды с примерами', () => {
    const catalog = voiceHelpCatalog()
    const flat = catalog.flatMap((g) => g.items)
    const withExamples = commandRegistry.all().filter((c) => c.examples.length > 0)
    expect(flat.length).toBe(withExamples.length)
  })

  it('группирует по категориям, у каждого пункта есть примеры', () => {
    const catalog = voiceHelpCatalog()
    expect(catalog.length).toBeGreaterThan(3)
    for (const group of catalog) {
      expect(group.category).toBeTruthy()
      for (const item of group.items) {
        expect(item.examples.length).toBeGreaterThan(0)
      }
    }
  })

  it('содержит ключевые категории', () => {
    const cats = voiceHelpCatalog().map((g) => g.category)
    expect(cats).toContain('Создание')
    expect(cats).toContain('Изменение задачи')
    expect(cats).toContain('Навигация')
  })

  it('voiceHelpItems — по одному примеру на команду', () => {
    expect(voiceHelpItems().length).toBe(
      commandRegistry.all().filter((c) => c.examples.length > 0).length,
    )
  })
})
