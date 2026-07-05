import { describe, it, expect } from 'vitest'
import { AxiosError, type AxiosResponse } from 'axios'
import { voiceErrorMessage } from '../voiceErrorMessage'

function axiosErr(data: unknown, status = 400): AxiosError {
  const response = {
    data,
    status,
    statusText: '',
    headers: {},
    config: {} as never,
  } as AxiosResponse
  return new AxiosError('request failed', 'ERR_BAD', undefined, {}, response)
}

describe('voiceErrorMessage', () => {
  it('plain-string от бэкенда → как есть', () => {
    expect(voiceErrorMessage(axiosErr('Спринт уже активен'))).toBe(
      'Спринт уже активен',
    )
  })

  it('{ message } → message', () => {
    expect(voiceErrorMessage(axiosErr({ message: 'Нет прав на действие' }))).toBe(
      'Нет прав на действие',
    )
  })

  it('ошибки полей (валидация) → собираются в строку', () => {
    const msg = voiceErrorMessage(
      axiosErr({ title: ['Поле TITLE не может быть пустым'] }),
    )
    expect(msg).toBe('Поле TITLE не может быть пустым')
  })

  it('несколько полей → через разделитель', () => {
    const msg = voiceErrorMessage(
      axiosErr({ id: ['Некорректный формат'], status: ['Пустое поле'] }),
    )
    expect(msg).toContain('Некорректный формат')
    expect(msg).toContain('Пустое поле')
  })

  it('500 → понятное сообщение о сервере', () => {
    expect(voiceErrorMessage(axiosErr(null, 500))).toMatch(/сервера/i)
  })

  it('не-axios ошибка → общий фолбэк', () => {
    expect(voiceErrorMessage(new Error('boom'))).toBe('Не удалось выполнить команду')
  })
})
