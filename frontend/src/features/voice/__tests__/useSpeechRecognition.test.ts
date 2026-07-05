import { describe, it, expect } from 'vitest'
import {
  endsWithStopPhrase,
  stripStopPhrase,
  DEFAULT_STOP_PHRASE,
} from '../useSpeechRecognition'

describe('endsWithStopPhrase (ТП-111)', () => {
  it('распознаёт стоп-фразу в конце', () => {
    expect(endsWithStopPhrase('купить хлеб работаем', 'работаем')).toBe(true)
    expect(endsWithStopPhrase('всё готово Работаем', 'работаем')).toBe(true)
  })

  it('игнорирует пунктуацию и ё', () => {
    expect(endsWithStopPhrase('поехали, ёлки работаем.', 'работаем')).toBe(true)
  })

  it('не срабатывает на похожих словах', () => {
    expect(endsWithStopPhrase('система работает', 'работаем')).toBe(false)
    expect(endsWithStopPhrase('купить хлеб', 'работаем')).toBe(false)
  })

  it('стоп-фраза не в конце — не завершает', () => {
    expect(endsWithStopPhrase('работаем над задачей', 'работаем')).toBe(false)
  })

  it('поддерживает многословную фразу', () => {
    expect(endsWithStopPhrase('готово стоп запись', 'стоп запись')).toBe(true)
  })

  it('дефолтная стоп-фраза — «работаем»', () => {
    expect(DEFAULT_STOP_PHRASE).toBe('работаем')
  })
})

describe('stripStopPhrase (ТП-111)', () => {
  it('убирает завершающую стоп-фразу, сохраняя остальной текст', () => {
    expect(stripStopPhrase('Купить хлеб работаем', 'работаем')).toBe('Купить хлеб')
    expect(stripStopPhrase('Купить хлеб. Работаем', 'работаем')).toBe('Купить хлеб.')
  })

  it('только стоп-фраза → пусто', () => {
    expect(stripStopPhrase('Работаем', 'работаем')).toBe('')
  })

  it('нет стоп-фразы → текст без изменений', () => {
    expect(stripStopPhrase('Купить хлеб', 'работаем')).toBe('Купить хлеб')
  })

  it('убирает многословную фразу', () => {
    expect(stripStopPhrase('готово стоп запись', 'стоп запись')).toBe('готово')
  })
})
