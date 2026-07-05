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
  it('рендерит подпись, поле и счётчик символов', () => {
    render(<Harness />)
    expect(screen.getByText('Описание')).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/Опишите задачу/)).toBeInTheDocument()
    expect(screen.getByText('0/4096')).toBeInTheDocument()
  })

  it('счётчик обновляется при вводе', () => {
    render(<Harness />)
    const area = screen.getByPlaceholderText(/Опишите задачу/)
    fireEvent.change(area, { target: { value: 'привет' } })
    expect(screen.getByText('6/4096')).toBeInTheDocument()
  })
})
