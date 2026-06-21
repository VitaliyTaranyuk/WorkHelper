export const truncateText = (text: string, maxLength: number = 100): string => {
  const diff = maxLength - text.length
  if (diff >= 0) {
    return text
  }

  return text.slice(0, maxLength - 3) + '...'
}
