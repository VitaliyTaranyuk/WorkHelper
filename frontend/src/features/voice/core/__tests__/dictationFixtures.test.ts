import { describe, it, expect } from 'vitest'
import { localTextFormatter } from '../textFormatter'
import { TITLE_MAX_CHARS } from '@/shared/text/generateTaskTitle'

/**
 * ТП-212: фикстуры реальных надиктовок и инварианты локального конвейера.
 *
 * Проверяется ДЕТЕРМИНИРОВАННЫЙ слой (TextFormatter + generateTaskTitle) —
 * ровно то, что работает у пользователя без ключа провайдера и остаётся
 * фолбэком при любой его недоступности. Ответ DeepSeek здесь не мокается:
 * тест, «проверяющий» выдуманный ответ модели, ничего не гарантирует.
 *
 * Главный инвариант — надиктованное не теряется: диктовка может быть
 * переформатирована, но не сокращена и не пересказана.
 */

type Fixture = {
  name: string
  transcript: string
  /** Фрагменты, которые обязаны сохраниться в тексте ДОСЛОВНО. */
  verbatim?: string[]
}

const FIXTURES: Fixture[] = [
  {
    name: 'обычная постановка задачи',
    transcript:
      'нужно поправить фильтры на доске они сбрасываются при переходе между спринтами',
    verbatim: ['фильтр', 'спринт'],
  },
  {
    name: 'дефект с шагами воспроизведения',
    transcript:
      'при загрузке файла больше десяти мегабайт карточка задачи падает точка '
      + 'воспроизводится стабильно точка',
    verbatim: ['карточка', 'мегабайт'],
  },
  {
    name: 'слова-паразиты и междометия',
    transcript: 'э-э нужно м-м добавить кнопку экспорта в списке задач',
    verbatim: ['экспорт'],
  },
  {
    name: 'самоисправление в речи',
    transcript: 'сделать выгрузку во вторник нет в среду',
    verbatim: ['выгрузку'],
  },
  {
    name: 'идентификаторы и код',
    transcript: 'в файле TaskCardModal.tsx падает useNavigate починить ТП-172',
    verbatim: ['TaskCardModal.tsx', 'useNavigate', 'ТП-172'],
  },
  {
    name: 'смешанный язык',
    transcript: 'добавить retry на pull request в dev панели задачи',
    verbatim: ['retry', 'pull request', 'dev'],
  },
  {
    name: 'номера версий и пути',
    transcript: 'обновить spring boot до версии 3.4 в backend build.gradle',
    verbatim: ['spring boot', '3.4', 'build.gradle'],
  },
  {
    name: 'голосовая пунктуация (ТП-135)',
    transcript: 'починить логин запятая иначе пользователи не войдут точка',
    verbatim: ['логин'],
  },
  {
    name: 'односложный ввод',
    transcript: 'логин',
    verbatim: ['логин'],
  },
  {
    name: 'длинная диктовка в несколько мыслей',
    transcript:
      'переделать уведомления точка сейчас они приходят с задержкой точка '
      + 'нужно чтобы приходили сразу после изменения статуса задачи точка '
      + 'и добавить группировку по проектам точка',
    verbatim: ['уведомлени', 'группировку'],
  },
  {
    name: 'вопрос вместо постановки',
    transcript: 'почему падает сборка на windows',
    verbatim: ['сборка', 'windows'],
  },
  {
    name: 'пустой ввод',
    transcript: '',
  },
  {
    name: 'только пробелы',
    transcript: '   ',
  },
]

/** Значимые слова исходника (без служебных и произнесённой пунктуации). */
const PUNCTUATION_WORDS = new Set([
  'точка',
  'запятая',
  'двоеточие',
  'тире',
  'многоточие',
])

function significantWords(text: string): string[] {
  return text
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length >= 5 && !PUNCTUATION_WORDS.has(w))
}

describe('ТП-212: локальная обработка надиктовок — диктовка в поле', () => {
  it.each(FIXTURES)('$name: текст не теряется', ({ transcript }) => {
    const formatted = localTextFormatter.formatDictation(transcript)

    if (!transcript.trim()) {
      expect(formatted.trim()).toBe('')
      return
    }
    // Ни одно значимое слово не должно пропасть при форматировании.
    for (const word of significantWords(transcript)) {
      expect(formatted.toLowerCase()).toContain(word)
    }
  })

  it.each(FIXTURES.filter((f) => f.verbatim))(
    '$name: технические фрагменты переносятся дословно',
    ({ transcript, verbatim }) => {
      const formatted = localTextFormatter.formatDictation(transcript)
      for (const fragment of verbatim ?? []) {
        expect(formatted.toLowerCase()).toContain(fragment.toLowerCase())
      }
    },
  )
})

describe('ТП-212: локальная обработка надиктовок — черновик задачи', () => {
  it.each(FIXTURES)('$name: черновик собирается без потери текста', ({ transcript }) => {
    const draft = localTextFormatter.toTaskDraft(transcript)

    if (!transcript.trim()) {
      expect(draft.title).toBe('')
      return
    }

    expect(draft.title.length).toBeLessThanOrEqual(TITLE_MAX_CHARS)
    expect(draft.title.trim()).not.toBe('')

    // Весь текст лежит либо в описании, либо (для коротких постановок) целиком
    // в названии — потерять его конвейер не имеет права.
    const combined = `${draft.title} ${draft.description ?? ''}`.toLowerCase()
    for (const word of significantWords(transcript)) {
      expect(combined).toContain(word)
    }
  })

  it('название не заканчивается точкой и не обёрнуто в кавычки', () => {
    for (const { transcript } of FIXTURES) {
      const { title } = localTextFormatter.toTaskDraft(transcript)
      if (!title) continue
      expect(title.endsWith('.')).toBe(false)
      expect(title.startsWith('"')).toBe(false)
      expect(title.startsWith('«')).toBe(false)
    }
  })
})
