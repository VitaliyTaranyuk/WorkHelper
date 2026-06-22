import {
  AuthPageStyled,
  AuthWelcomeStyled,
  AuthFormContainerStyled,
} from './AuthPage.styles'
import { useMatchRoute, useNavigate } from '@tanstack/react-router'
import { AuthSwitch } from './AuthPage.muiStyles'
import { useLogin } from './form/LoginForm/useLogin'

import { useState } from 'react'
import { RegisterForm } from './form/RegisterForm/RegisterForm'
import { SuccessRegisteredPage } from './SuccessRegisteredPage'
import { LoginForm } from './form/LoginForm/LoginForm'
import { useAuthStore } from '../../features/auth/authStore'

export function AuthPage({ redirect = '/main' }: { redirect?: string }) {
  const [isRegistered, setIsRegistered] = useState(false)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  const { submit } = useLogin()
  const navigate = useNavigate()
  const matchRoute = useMatchRoute()
  const isRegisterRoute = matchRoute({ to: '/register' })
  const isLoginRoute = matchRoute({ to: '/login' })

  if (isAuthenticated) {
    navigate({ to: redirect })
    return null
  }

  const onSwitchChange = () => {
    if (isRegisterRoute) {
      navigate({ to: '/login', search: { redirect } })
    } else {
      navigate({ to: '/register', search: { redirect } })
    }
  }

  if (submit.isLoading) {
    return <div>Loading...</div>
  }

  if (isRegistered) {
    return <SuccessRegisteredPage onClick={() => setIsRegistered(false)} />
  }

  return (
    <AuthPageStyled>
      <AuthFormContainerStyled>
        <AuthWelcomeStyled>
          <h1>
            Добро пожаловать <br />в WorkTask!
          </h1>
          <p>Войдите в свой аккаунт или создайте новый</p>
        </AuthWelcomeStyled>
        <AuthSwitch
          disableRipple
          checked={!!isRegisterRoute}
          onChange={onSwitchChange}
        />
        {isRegisterRoute && (
          <RegisterForm onSuccess={() => setIsRegistered(true)} />
        )}
        {isLoginRoute && <LoginForm />}
      </AuthFormContainerStyled>
    </AuthPageStyled>
  )
}
