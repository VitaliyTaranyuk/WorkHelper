import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { useForm } from 'react-hook-form'
import { TaskDescriptionField } from '../TaskDescriptionField'
import type { FormValues } from '../TaskForm/useTaskForm'

function Harness() {
  const form = useForm<FormValues>({ defaultValues: { description: '' } })
  return <TaskDescriptionField form={form} />
}

describe('TaskDescriptionField', () => {
  it('рендерит подпись и поле; счётчик скрыт при пустом описании', () => {
    render(<Harness />)
    expect(screen.getByText('Описание')).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/Опишите задачу/)).toBeInTheDocument()
    expect(screen.queryByText(/символов/)).not.toBeInTheDocument()
  })

  it('счётчик информационный, без потолка (лимит снят в ТП-187)', () => {
    render(<Harness />)
    const area = screen.getByPlaceholderText(/Опишите задачу/)
    fireEvent.change(area, { target: { value: 'привет' } })
    expect(screen.getByText('6 символов')).toBeInTheDocument()
  })

  it('поле не ограничивает длину ввода (ТП-187: без maxLength)', () => {
    render(<Harness />)
    const area = screen.getByPlaceholderText<HTMLTextAreaElement>(/Опишите задачу/)
    expect(area).not.toHaveAttribute('maxlength')
    const long = 'а'.repeat(20_000)
    fireEvent.change(area, { target: { value: long } })
    expect(area.value).toHaveLength(20_000)
  })
})
