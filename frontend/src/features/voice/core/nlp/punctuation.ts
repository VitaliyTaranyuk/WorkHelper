/**
 * Голосовая пунктуация для диктовки (ТП-135, находка F-013 аудита).
 *
 * Web Speech API в ru-RU почти не расставляет знаки препинания — длинная
 * диктовка получается сплошным текстом. Здесь ТОЛЬКО детерминированные замены
 * произнесённых названий знаков на сами знаки + капитализация после конца
 * предложения (паттерн Google voice typing / Яндекс Клавиатуры). Никакого AI,
 * смысл не меняется — расширение изолированного слоя форматтера (ADR: голос).
 */

type PunctKind =
  | 'attachLeft' // знак «прилипает» к предыдущему слову, пробел после: , . ; : ! ? …
  | 'newline'
  | 'paragraph'
  | 'dash' // тире в пробелах: слово — слово
  | 'openParen'
  | 'closeParen'

type Command = { words: string[]; kind: PunctKind; value?: string; endsSentence?: boolean }

// Многословные команды идут ПЕРЕД однословными (жадное совпадение по длине).
const COMMANDS: Command[] = [
  { words: ['точка', 'с', 'запятой'], kind: 'attachLeft', value: ';' },
  { words: ['с', 'новой', 'строки'], kind: 'newline' },
  { words: ['с', 'нового', 'абзаца'], kind: 'paragraph' },
  { words: ['новая', 'строка'], kind: 'newline' },
  { words: ['новый', 'абзац'], kind: 'paragraph' },
  { words: ['перенос', 'строки'], kind: 'newline' },
  { words: ['восклицательный', 'знак'], kind: 'attachLeft', value: '!', endsSentence: true },
  { words: ['вопросительный', 'знак'], kind: 'attachLeft', value: '?', endsSentence: true },
  { words: ['открывающая', 'скобка'], kind: 'openParen' },
  { words: ['закрывающая', 'скобка'], kind: 'closeParen' },
  { words: ['запятая'], kind: 'attachLeft', value: ',' },
  { words: ['точка'], kind: 'attachLeft', value: '.', endsSentence: true },
  { words: ['многоточие'], kind: 'attachLeft', value: '…', endsSentence: true },
  { words: ['двоеточие'], kind: 'attachLeft', value: ':' },
  { words: ['тире'], kind: 'dash' },
]

const MAX_PHRASE = 3

function normalize(token: string): string {
  return token
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[.,!?;:()"'—…-]/g, '')
}

function capitalize(word: string): string {
  return word.length === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1)
}

/**
 * Преобразует произнесённые названия знаков в знаки и капитализирует начала
 * предложений. Возвращает готовый к вставке текст.
 */
export function applySpokenPunctuation(raw: string): string {
  const tokens = raw.trim().split(/\s+/).filter(Boolean)
  if (tokens.length === 0) return ''

  let result = ''
  let capitalizeNext = true

  const lastChar = () => result.slice(-1)
  const trimTrailingSpaces = () => {
    result = result.replace(/[ \t]+$/, '')
  }

  const emitWord = (word: string) => {
    const w = capitalizeNext ? capitalize(word) : word
    const last = lastChar()
    if (result === '' || last === '\n' || last === '(') result += w
    else result += ' ' + w
    capitalizeNext = false
  }

  for (let i = 0; i < tokens.length; ) {
    // Ищем самую длинную команду, начинающуюся с текущего токена.
    let matched: Command | null = null
    for (let len = Math.min(MAX_PHRASE, tokens.length - i); len >= 1; len--) {
      const slice = tokens.slice(i, i + len).map(normalize)
      const cmd = COMMANDS.find(
        (c) =>
          c.words.length === len && c.words.every((w, k) => w === slice[k]),
      )
      if (cmd) {
        matched = cmd
        i += len
        break
      }
    }

    if (!matched) {
      emitWord(tokens[i])
      i += 1
      continue
    }

    switch (matched.kind) {
      case 'attachLeft':
        trimTrailingSpaces()
        result += matched.value
        if (matched.endsSentence) capitalizeNext = true
        break
      case 'newline':
        trimTrailingSpaces()
        result += '\n'
        capitalizeNext = true
        break
      case 'paragraph':
        trimTrailingSpaces()
        result += '\n\n'
        capitalizeNext = true
        break
      case 'dash':
        trimTrailingSpaces()
        result += ' —'
        break
      case 'openParen':
        if (result !== '' && lastChar() !== '\n') result += ' '
        result += '('
        break
      case 'closeParen':
        trimTrailingSpaces()
        result += ')'
        break
    }
  }

  return result.trim()
}
