import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TaskCardLoadError } from '../TaskCardLoadError'

function http(status: number) {
  return { response: { status } }
}

describe('TaskCardLoadError', () => {
  it('404: «задача не найдена», без кнопки «Повторить»', () => {
    const onClose = vi.fn()
    render(
      <TaskCardLoadError
        code="ТП-125"
        error={http(404)}
        onRetry={() => {}}
        onClose={onClose}
      />,
    )
    expect(screen.getByText('Задача ТП-125 не найдена')).toBeInTheDocument()
    expect(screen.queryByText('Повторить')).not.toBeInTheDocument()
    fireEvent.click(screen.getByText('Закрыть'))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('прочие ошибки: «не удалось загрузить» и «Повторить»', () => {
    const onRetry = vi.fn()
    render(
      <TaskCardLoadError
        code="ТП-1"
        error={new Error('Network Error')}
        onRetry={onRetry}
        onClose={() => {}}
      />,
    )
    expect(
      screen.getByText('Не удалось загрузить задачу ТП-1'),
    ).toBeInTheDocument()
    fireEvent.click(screen.getByText('Повторить'))
    expect(onRetry).toHaveBeenCalledOnce()
  })
})
