import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { useAuthStore } from '@/features/auth/authStore'
import { Route } from '@/routes/_auth'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'

export function useLogin() {
  const form = useLoginForm()
  const submit = useLoginSubmit()

  return { form, submit }
}

const loginSchema = z.object({
  email: z.string().email({ message: 'Некорректный формат почты' }),
  password: z
    .string()
    .min(8, { message: 'Пароль должен быть не менее 8 символов' }),
})

type LoginFormData = z.infer<typeof loginSchema>

function useLoginForm() {
  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
    mode: 'onTouched',
    reValidateMode: 'onChange',
  })

  return form
}

function useLoginSubmit() {
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const auth = useAuthStore()
  const navigate = useNavigate()
  const redirect = Route.useSearch()?.redirect

  const onSubmit: (data: LoginFormData) => Promise<void> = async (
    data: LoginFormData,
  ) => {
    setIsLoading(true)
    setError('')

    try {
      await auth.login({ userName: data.email, password: data.password })
      // ТП-35: недопринятое приглашение переживает регистрацию/логин —
      // возвращаем пользователя на страницу приглашения (она его применит).
      const pendingInvite = localStorage.getItem('pendingInviteToken')
      navigate({
        to: redirect || (pendingInvite ? `/invite/${pendingInvite}` : '/'),
      })
    } catch {
      setError('Неверное имя пользователя или пароль')
    } finally {
      setIsLoading(false)
    }
  }

  return {
    onSubmit,
    error,
    isLoading,
  }
}
