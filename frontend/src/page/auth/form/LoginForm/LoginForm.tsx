import InputAdornment from '@mui/material/InputAdornment'
import {
  FormStyled,
  FormSubmitWrapper,
  FormSubmitStyled,
  FormErrorStyled,
} from '../Form.styles'
import { Controller } from 'react-hook-form'
import { useState } from 'react'
import { InputTextField } from '../Form.muiStyles'
import { useLogin } from './useLogin'
import IconButton from '@mui/material/IconButton'
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined'
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined'

export interface LoginFormData {
  email: string
  password: string
}

export function LoginForm() {
  const { submit, form } = useLogin()
  const [showPassword, setShowPassword] = useState(false)

  return (
    <FormStyled onSubmit={form.handleSubmit(submit.onSubmit)}>
      <Controller
        name="email"
        control={form.control}
        render={({ field }) => (
          <InputTextField
            {...field}
            label="Почта"
            placeholder="ljenkins777@example.com"
            variant="outlined"
            size="small"
            error={!!form.formState.errors.email}
            helperText={form.formState.errors.email?.message}
            autoFocus
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <EmailOutlinedIcon />
                  </InputAdornment>
                ),
              },
            }}
          />
        )}
      />

      <Controller
        name="password"
        control={form.control}
        render={({ field }) => (
          <InputTextField
            {...field}
            type={showPassword ? 'text' : 'password'}
            label="Пароль"
            placeholder="Введите пароль"
            variant="outlined"
            size="small"
            error={!!form.formState.errors.password}
            helperText={form.formState.errors.password?.message}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <LockOutlinedIcon />
                  </InputAdornment>
                ),
                endAdornment: (
                  <IconButton
                    sx={{ fontSize: '1rem' }}
                    onClick={() => {
                      setShowPassword((prev) => !prev)
                    }}
                  >
                    {showPassword ? (
                      <VisibilityOutlinedIcon />
                    ) : (
                      <VisibilityOffOutlinedIcon />
                    )}
                  </IconButton>
                ),
              },
            }}
          />
        )}
      />

      <FormSubmitWrapper>
        <FormErrorStyled>{submit.error && `${submit.error}`}</FormErrorStyled>
        {/* TODO: поменять на кнопку из UI-KIT когда будет готова */}
        <FormSubmitStyled disabled={!form.formState.isValid}>
          Войти
        </FormSubmitStyled>
      </FormSubmitWrapper>
    </FormStyled>
  )
}
