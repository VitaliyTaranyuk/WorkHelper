import { describe, expect, it, vi, beforeEach } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'

const navigate = vi.fn()
const login = vi.fn()
let search: { redirect?: string } = {}

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => navigate,
}))

vi.mock('@/routes/_auth', () => ({
  Route: { useSearch: () => search },
}))

vi.mock('@/features/auth/authStore', () => ({
  useAuthStore: () => ({ login }),
}))

import { useLogin } from '../useLogin'

/**
 * T-202: вход в приложение.
 *
 * `page/auth` — пять компонентов и ноль тестов до T-202, при том что отказ
 * входа делает недоступным всё остальное. Здесь закрепляются три свойства,
 * каждое из которых уже имеет цену в истории проекта:
 *
 *   1. приоритет перехода после входа — `redirect` важнее недопринятого
 *      приглашения, приглашение важнее корня (ТП-35: приглашение обязано
 *      пережить логин);
 *   2. наружу идёт общее сообщение, а не текст сервера (K-34);
 *   3. валидация отвергает короткий пароль и битую почту ДО запроса — иначе
 *      каждая опечатка становится сетевым вызовом.
 */
describe('useLogin (T-202)', () => {
  beforeEach(() => {
    navigate.mockClear()
    login.mockReset().mockResolvedValue(undefined)
    search = {}
    localStorage.clear()
  })

  it('после входа ведёт на redirect, если он задан', async () => {
    search = { redirect: '/project/p1/board' }
    localStorage.setItem('pendingInviteToken', 'tok')

    const { result } = renderHook(() => useLogin())
    await act(async () => {
      await result.current.submit.onSubmit({ email: 'a@b.co', password: '12345678' })
    })

    expect(navigate).toHaveBeenCalledWith({ to: '/project/p1/board' })
  })

  it('без redirect ведёт на недопринятое приглашение (ТП-35)', async () => {
    localStorage.setItem('pendingInviteToken', 'tok-42')

    const { result } = renderHook(() => useLogin())
    await act(async () => {
      await result.current.submit.onSubmit({ email: 'a@b.co', password: '12345678' })
    })

    expect(navigate).toHaveBeenCalledWith({ to: '/invite/tok-42' })
  })

  it('без redirect и без приглашения ведёт на корень', async () => {
    const { result } = renderHook(() => useLogin())
    await act(async () => {
      await result.current.submit.onSubmit({ email: 'a@b.co', password: '12345678' })
    })

    expect(navigate).toHaveBeenCalledWith({ to: '/' })
  })

  it('при отказе показывает общее сообщение и не раскрывает ответ сервера', async () => {
    login.mockRejectedValue(new Error('JDBC: constraint users_pkey violated'))

    const { result } = renderHook(() => useLogin())
    await act(async () => {
      await result.current.submit.onSubmit({ email: 'a@b.co', password: '12345678' })
    })

    expect(result.current.submit.error).toBe('Неверное имя пользователя или пароль')
    expect(navigate).not.toHaveBeenCalled()
  })

  it('снимает флаг загрузки и после успеха, и после отказа', async () => {
    login.mockRejectedValue(new Error('boom'))

    const { result } = renderHook(() => useLogin())
    await act(async () => {
      await result.current.submit.onSubmit({ email: 'a@b.co', password: '12345678' })
    })

    // Незакрытый isLoading оставил бы кнопку входа заблокированной навсегда.
    await waitFor(() => expect(result.current.submit.isLoading).toBe(false))
  })

  it('отвергает битую почту и короткий пароль до обращения к серверу', async () => {
    // `formState` в react-hook-form — Proxy: он обновляется только для полей,
    // прочитанных во время РЕНДЕРА. Без явного обращения к `errors` внутри
    // renderHook подписки не возникает, и тест видит пустой объект даже когда
    // валидация отработала. Это свойство библиотеки, а не признак того, что
    // проверять нечего.
    const { result } = renderHook(() => {
      const value = useLogin()
      void value.form.formState.errors
      return value
    })

    let valid = true
    await act(async () => {
      result.current.form.setValue('email', 'не-почта')
      result.current.form.setValue('password', '123')
      valid = await result.current.form.trigger()
    })

    expect(valid).toBe(false)

    expect(result.current.form.formState.errors.email?.message).toBe(
      'Некорректный формат почты',
    )
    expect(result.current.form.formState.errors.password?.message).toBe(
      'Пароль должен быть не менее 8 символов',
    )
    expect(login).not.toHaveBeenCalled()
  })
})
