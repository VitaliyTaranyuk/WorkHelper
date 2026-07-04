import { useEffect, useRef, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Button, CircularProgress, Stack, Typography } from '@mui/material'
import { workTechApi } from '@/shared/api/endpoint'
import { useAuthStore } from '@/features/auth/authStore'
import { extractGeneralError } from '@/shared/api/extractFieldErrors'
import { toast } from 'sonner'

export const Route = createFileRoute('/invite/$token')({
  component: InvitePage,
})

/**
 * Приём приглашения в проект (ТП-35). Публичный маршрут:
 *  - авторизованный пользователь сразу присоединяется к проекту;
 *  - гость отправляется на вход/регистрацию, токен сохраняется и
 *    применяется автоматически после логина (useLogin возвращает сюда).
 */
function InvitePage() {
  const { token } = Route.useParams()
  const navigate = useNavigate()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const [error, setError] = useState('')
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true

    if (!isAuthenticated) {
      // Токен переживает регистрацию/логин: useLogin после входа вернёт сюда.
      localStorage.setItem('pendingInviteToken', token)
      navigate({ to: '/login', search: { redirect: `/invite/${token}` } })
      return
    }

    workTechApi.project
      .acceptInvite({ token })
      .then((res) => {
        localStorage.removeItem('pendingInviteToken')
        toast.success(
          res.data.alreadyMember
            ? `Вы уже участник проекта «${res.data.projectName}»`
            : `Вы присоединились к проекту «${res.data.projectName}»`,
        )
        navigate({ to: '/main' })
      })
      .catch((err) => {
        localStorage.removeItem('pendingInviteToken')
        setError(
          extractGeneralError(err) ??
            'Приглашение недействительно или уже использовано',
        )
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <Stack alignItems="center" justifyContent="center" minHeight="60vh" gap={2}>
      {!error ? (
        <>
          <CircularProgress size={32} />
          <Typography color="text.secondary">
            Присоединяем вас к проекту…
          </Typography>
        </>
      ) : (
        <>
          <Typography variant="h6">Не удалось принять приглашение</Typography>
          <Typography color="text.secondary">{error}</Typography>
          <Button variant="contained" onClick={() => navigate({ to: '/' })}>
            На главную
          </Button>
        </>
      )}
    </Stack>
  )
}
