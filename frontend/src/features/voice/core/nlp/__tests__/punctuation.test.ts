import { describe, it, expect } from 'vitest'
import { applySpokenPunctuation } from '../punctuation'

describe('applySpokenPunctuation', () => {
  it('запятая прилипает к слову слева, пробел справа', () => {
    expect(applySpokenPunctuation('привет запятая как дела')).toBe(
      'Привет, как дела',
    )
  })

  it('точка завершает предложение и капитализирует следующее', () => {
    expect(
      applySpokenPunctuation('это первое предложение точка это второе'),
    ).toBe('Это первое предложение. Это второе')
  })

  it('вопросительный и восклицательный знаки (двусловные)', () => {
    expect(applySpokenPunctuation('готово вопросительный знак')).toBe(
      'Готово?',
    )
    expect(applySpokenPunctuation('ура восклицательный знак')).toBe('Ура!')
  })

  it('«точка с запятой» матчится раньше одиночной «точка»', () => {
    expect(applySpokenPunctuation('раз точка с запятой два')).toBe(
      'Раз; два',
    )
  })

  it('двоеточие и тире', () => {
    expect(applySpokenPunctuation('список двоеточие молоко')).toBe(
      'Список: молоко',
    )
    expect(applySpokenPunctuation('слева тире справа')).toBe('Слева — справа')
  })

  it('перенос строки и новый абзац капитализируют следующее', () => {
    expect(applySpokenPunctuation('первая с новой строки вторая')).toBe(
      'Первая\nВторая',
    )
    expect(applySpokenPunctuation('раздел новый абзац текст')).toBe(
      'Раздел\n\nТекст',
    )
  })

  it('скобки', () => {
    expect(
      applySpokenPunctuation(
        'заметка открывающая скобка важно закрывающая скобка конец',
      ),
    ).toBe('Заметка (важно) конец')
  })

  it('устойчив к регистру, ё и знакам в самих словах команд', () => {
    expect(applySpokenPunctuation('да Запятая нет')).toBe('Да, нет')
  })

  it('слово, похожее на команду внутри обычной речи, не ломает текст', () => {
    // «точку» (винительный падеж) — не команда «точка», остаётся словом
    expect(applySpokenPunctuation('поставь точку в конце')).toBe(
      'Поставь точку в конце',
    )
  })

  it('пустой ввод → пустая строка', () => {
    expect(applySpokenPunctuation('   ')).toBe('')
  })

  it('обычный текст без команд не меняется (кроме капитализации)', () => {
    expect(applySpokenPunctuation('обычная диктовка без пунктуации')).toBe(
      'Обычная диктовка без пунктуации',
    )
  })
})
