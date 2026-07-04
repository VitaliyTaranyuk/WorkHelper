export const truncateText = (text: string, maxLength: number = 100): string => {
  const diff = maxLength - text.length
  if (diff >= 0) {
    return text
  }

  return text.slice(0, maxLength - 3) + '...'
}

/** «5 задач», «1 задача», «22 задачи» — единый счётчик секций (ТП-61). */
export function pluralTasks(count: number): string {
  const mod10 = count % 10
  const mod100 = count % 100
  const word =
    mod10 === 1 && mod100 !== 11
      ? 'задача'
      : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)
        ? 'задачи'
        : 'задач'
  return `${count} ${word}`
}
