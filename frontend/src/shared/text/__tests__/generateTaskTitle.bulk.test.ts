import { describe, it, expect } from 'vitest'
import { generateTaskTitle, TITLE_MAX_CHARS } from '../generateTaskTitle'

/**
 * ТП-166, массовый прогон: комбинаторная матрица реальных формулировок
 * (вводная × суть × хвост) — сотни сценариев проверяются на ИНВАРИАНТАХ
 * гейта качества (не на точных строках): длина, точка, вводные-запреты,
 * обрыв на предлоге, капитализация, непустота.
 */

const INTROS = [
  '',
  'Нужно ',
  'Необходимо, чтобы ',
  'Прошу, ',
  'Хочу, чтобы ',
  'Было бы здорово, чтобы ',
  'Давайте ',
  'Есть предложение: ',
  'Проблема: ',
  '## Постановка\n\n**Важно.** ',
]

const CORES = [
  'добавить экспорт задач в CSV',
  'поправь перетаскивание карточек на доске',
  'уведомления не приходят после смены проекта',
  'календарь открывается не на той неделе',
  'вынести общую логику дат в отдельный модуль',
  'оптимизировать загрузку списка задач',
  'исследовать варианты офлайн-режима',
  'задокументировать процесс релиза',
  'голосовой ввод обрывается при паузе',
  'сделай тёмную тему для страницы входа',
  'переработать структуру настроек профиля',
  'кнопка сохранения не работает в карточке встречи',
  'убери дублирующий тост при создании спринта',
  'показывать аватары участников в комментариях',
  'при переключении проекта пропадает выбранный спринт',
]

const TAILS = [
  '',
  ', потому что пользователи жалуются',
  ', например как в Jira',
  ', чтобы было удобнее команде',
  '. Детали и скриншоты приложу в комментариях.',
  ' — иначе команда путается',
]

describe('generateTaskTitle V2 — комбинаторная матрица инвариантов', () => {
  it(`${INTROS.length * CORES.length * TAILS.length} сценариев проходят гейт качества`, () => {
    let checked = 0
    for (const intro of INTROS)
      for (const core of CORES)
        for (const tail of TAILS) {
          const input = `${intro}${core}${tail}`
          const title = generateTaskTitle(input)
          const label = `вход: «${input.slice(0, 70)}»`

          expect(title.length, label).toBeGreaterThan(0)
          expect(title.length, label).toBeLessThanOrEqual(TITLE_MAX_CHARS)
          expect(title, label).not.toMatch(/[.]\s*$/u)
          expect(title, label).not.toMatch(
            /^(необходимо|нужно|надо|прошу|хочу|хотелось|давай|пожалуйста|важно)(?=[\s,])/iu,
          )
          expect(title, label).not.toMatch(/реализовать\s+возможность/iu)
          expect(title, label).not.toMatch(
            /\s(?:в|на|по|за|с|к|о|от|до|из|у|при|для|и|или|но|чтобы|как)$/iu,
          )
          expect(title.charAt(0), label).toBe(title.charAt(0).toUpperCase())
          expect(title, label).not.toMatch(/[#*`>[\]]/u) // markdown не протёк
          checked++
        }
    expect(checked).toBe(INTROS.length * CORES.length * TAILS.length)
  })
})
