/**
 * Вставка надиктованного текста в поле (ТП-212).
 *
 * Диктовка приходит в два приёма: сначала мгновенный локальный результат, затем
 * (если улучшение удалось) его замена от DeepSeek. Обе точки вставки — поле
 * описания и поле комментария — работают одинаково, поэтому правило живёт здесь,
 * а не копируется в компонентах.
 *
 * Ключевой инвариант: подменяется ТОЛЬКО ранее вставленный фрагмент и только
 * если он всё ещё присутствует в поле нетронутым. Если пользователь успел
 * отредактировать текст, улучшенный вариант отбрасывается — правки человека
 * приоритетнее улучшений модели.
 */
export function applyDictation(
  current: string,
  text: string,
  options: { replaces?: string; separator?: string } = {},
): string {
  const { replaces, separator = '\n' } = options

  if (replaces === undefined) {
    return current ? `${current}${separator}${text}` : text
  }

  // Ищем с конца: диктовать могли несколько раз, заменяем последнюю вставку.
  const at = current.lastIndexOf(replaces)
  if (at === -1) return current
  return current.slice(0, at) + text + current.slice(at + replaces.length)
}
