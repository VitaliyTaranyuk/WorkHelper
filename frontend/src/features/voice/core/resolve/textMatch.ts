/**
 * Общие текстовые примитивы для распознавания (ТП-93/ТП-96). Вынесены из
 * entityResolver, чтобы переиспользовать в эвристическом резолвере (DRY).
 * Терпимы к русской словоизменяемости: нормализация, расстояние Левенштейна,
 * похожесть слов по префиксу/дистанции.
 */

/** Нижний регистр, ё→е, пунктуация → пробелы, схлопывание пробелов. */
export function normalizeText(s: string): string {
  return s
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[.,!?;:]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function levenshtein(a: string, b: string): number {
  const m = a.length
  const n = b.length
  if (m === 0) return n
  if (n === 0) return m
  let prev = Array.from({ length: n + 1 }, (_, i) => i)
  let curr = new Array<number>(n + 1)
  for (let i = 1; i <= m; i++) {
    curr[0] = i
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost)
    }
    ;[prev, curr] = [curr, prev]
  }
  return prev[n]
}

/**
 * Похожесть слов с учётом склонений: равенство, общий префикс (≥3 симв.) или
 * расстояние Левенштейна ≤1..2 по длине. «Ивану»↔«Иван», «Иванову»↔«Иванов».
 */
export function wordSimilar(a: string, b: string): boolean {
  if (!a || !b) return false
  if (a === b) return true
  const minL = Math.min(a.length, b.length)
  if (minL >= 3 && (a.startsWith(b) || b.startsWith(a))) return true
  const maxL = Math.max(a.length, b.length)
  if (maxL >= 4 && levenshtein(a, b) <= (maxL >= 6 ? 2 : 1)) return true
  return false
}
