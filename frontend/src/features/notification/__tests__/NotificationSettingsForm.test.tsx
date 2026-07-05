import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { NotificationSettingsForm } from '../NotificationSettingsForm'

const settings = {
  notifyMentions: true,
  notifyTaskCreated: false,
  notifyMeetings: true,
  reminderMinutes: 15,
}
const updateMock = vi.fn()
let loading = false

vi.mock('@/features/settings/useNotificationSettings', () => ({
  useNotificationSettings: () => ({ data: loading ? undefined : settings, isLoading: loading }),
  useUpdateNotificationSettings: () => ({ mutate: updateMock }),
}))

beforeEach(() => {
  updateMock.mockClear()
  loading = false
})

describe('NotificationSettingsForm', () => {
  it('показывает переключатели с текущими значениями', () => {
    render(<NotificationSettingsForm />)
    expect(screen.getByLabelText(/Упоминания в комментариях/)).toBeChecked()
    expect(screen.getByLabelText('Создание задачи')).not.toBeChecked()
    expect(screen.getByLabelText('Напоминания о встречах')).toBeChecked()
  })

  it('переключение отправляет обновление с патчем', () => {
    render(<NotificationSettingsForm />)
    fireEvent.click(screen.getByLabelText('Создание задачи'))
    expect(updateMock).toHaveBeenCalledWith({
      ...settings,
      notifyTaskCreated: true,
    })
  })

  it('во время загрузки — плейсхолдер', () => {
    loading = true
    render(<NotificationSettingsForm />)
    expect(screen.getByText(/Загрузка настроек/)).toBeInTheDocument()
  })
})
