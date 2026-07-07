/**
 * Код проекта (ТП-190). Практика зрелых TMS (Jira: 2–10 заглавных букв с
 * буквы; Linear: короткий код, авто из названия, редактируемый). Код —
 * префикс человекочитаемых кодов задач («ТП-1»), поэтому короткий и
 * начинается с буквы.
 *
 * Формат (маска): 2–6 символов; первый — буква (латиница или кириллица);
 * дальше буквы или цифры. Один и тот же паттерн проверяется на бэкенде
 * (ProjectRequestDto) — фронт лишь даёт мгновенную подсказку.
 */
export const PROJECT_CODE_PATTERN = /^[A-Za-zА-Яа-яЁё][A-Za-zА-Яа-яЁё0-9]{1,5}$/
export const PROJECT_CODE_HINT = 'Код: 2–6 символов, начинается с буквы (латиница или кириллица), дальше буквы или цифры'
export const PROJECT_CODE_MAX = 6

export function isValidProjectCode(code: string): boolean {
  return PROJECT_CODE_PATTERN.test(code)
}

/**
 * Автогенерация кода из названия: инициалы слов (2+ слова) или первые буквы
 * единственного слова. Оставляем только буквы/цифры, в верхний регистр,
 * не длиннее 6. «Тестовый проект» → «ТП», «Work Task» → «WT»,
 * «WorkTask» → «WOR».
 */
export function deriveProjectCode(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return ''
  const raw =
    words.length >= 2
      ? words.map((w) => w[0]).join('')
      : words[0].slice(0, 3)
  const cleaned = raw.replace(/[^A-Za-zА-Яа-яЁё0-9]/g, '').toUpperCase()
  return cleaned.slice(0, PROJECT_CODE_MAX)
}

/**
 * Приведение пользовательского ввода к маске в реальном времени: отбрасываем
 * недопустимые символы, поднимаем регистр, режем по длине. Валидность (в т.ч.
 * «первый символ — буква», «минимум 2») проверяет isValidProjectCode перед
 * отправкой — здесь только не даём набрать заведомо неформатное.
 */
export function normalizeProjectCodeInput(value: string): string {
  return value
    .replace(/[^A-Za-zА-Яа-яЁё0-9]/g, '')
    .toUpperCase()
    .slice(0, PROJECT_CODE_MAX)
}
