import { useState } from 'react'
import { useAuthStore } from '../../../../features/auth/authStore'
import { ValidationError } from '../../../../shared/api/errors'
import {
  useForm,
  type UseFormSetError,
  type UseFormReset,
} from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'

interface RegisterFormData {
  email: string
  firstName: string
  lastName: string
  password: string
  confirmPassword: string
}

const DEFAULT_FORM_VALUES = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  confirmPassword: '',
}

export function useRegister(onSuccess: () => void) {
  const form = useRegisterForm()
  const register = useRegisterSubmit({
    setError: form.setError,
    reset: form.reset,
    onSuccess,
  })

  return { form, register }
}

const registerSchema = z
  .object({
    email: z.string().email({ message: 'Некорректный формат почты' }),
    firstName: z
      .string()
      .min(2, { message: 'Имя должно быть не менее 2 символов' }),
    lastName: z
      .string()
      .min(3, { message: 'Фамилия должна быть не менее 3 символов' }),
    password: z
      .string()
      .min(8, { message: 'Пароль должлен быть не менее 8 символов' }),
    confirmPassword: z.string(),
  })
  .superRefine(({ password, confirmPassword }, ctx) => {
    if (password !== confirmPassword) {
      ctx.addIssue({
        path: ['confirmPassword'],
        code: 'custom',
        message: 'Пароли не совпадают',
      })
    }
  })

function useRegisterForm() {
  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: DEFAULT_FORM_VALUES,
    reValidateMode: 'onChange',
    mode: 'onTouched',
  })

  return form
}

function useRegisterSubmit({
  setError,
  reset,
  onSuccess,
}: {
  setError: UseFormSetError<RegisterFormData>
  reset: UseFormReset<RegisterFormData>
  onSuccess: () => void
}) {
  const [serverError, setServerError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const auth = useAuthStore()

  const onSubmit = async (formData: RegisterFormData) => {
    setIsLoading(true)
    setServerError('')

    try {
      await auth.register({ ...formData, gender: 'MALE' })
      setIsSuccess(true)
      reset(DEFAULT_FORM_VALUES)
      onSuccess()
    } catch (e) {
      if (e instanceof ValidationError) {
        Object.entries(e.fieldErrors).forEach(([field, messages]) => {
          setError(field as keyof RegisterFormData, {
            type: 'server',
            message: messages[0],
          })
        })
      } else {
        setServerError('Произошла ошибка. Повторите попытку позже')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return {
    onSubmit,
    serverError,
    isLoading,
    isSuccess,
  }
}
