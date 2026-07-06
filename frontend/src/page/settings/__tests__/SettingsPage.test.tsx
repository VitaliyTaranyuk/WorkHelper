import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SettingsPage } from '../SettingsPage'

describe('SettingsPage (ТП-150)', () => {
  it('три секции-карточки с заголовками', () => {
    render(<SettingsPage />)
    expect(screen.getByText('Тема оформления')).toBeInTheDocument()
    expect(screen.getByText('Голосовой помощник')).toBeInTheDocument()
    expect(screen.getByText('Данные интерфейса')).toBeInTheDocument()
  })

  it('справочник команд свёрнут по умолчанию и раскрывается по запросу', () => {
    render(<SettingsPage />)
    // простыни каталога нет, пока не попросили
    expect(screen.queryByText('Что умеет — примеры фраз')).not.toBeInTheDocument()

    fireEvent.click(
      screen.getByRole('button', { name: /Справочник команд и примеры фраз/ }),
    )
    expect(screen.getByText('Что умеет — примеры фраз')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /Скрыть справочник команд/ }),
    ).toBeInTheDocument()
  })

  it('обучение — главный CTA секции голосового помощника', () => {
    render(<SettingsPage />)
    expect(
      screen.getByRole('button', { name: /Пройти обучение/ }),
    ).toBeInTheDocument()
  })
})
