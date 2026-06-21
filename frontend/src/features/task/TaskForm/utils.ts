// Переиспользуемая функция для обработки навигации по опциям
export function createOptionNavigationHandler<T extends string>(
  field: { value: T; onChange: (value: T) => void },
  options: readonly T[],
) {
  return (e: React.KeyboardEvent) => {
    const currentIndex = options.indexOf(field.value)

    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault()
      const nextIndex = (currentIndex + 1) % options.length
      field.onChange(options[nextIndex])
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault()
      const prevIndex =
        currentIndex === 0 ? options.length - 1 : currentIndex - 1
      field.onChange(options[prevIndex])
    }
  }
}
