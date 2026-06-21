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
import { useRegister } from './useRegister'
import IconButton from '@mui/material/IconButton'
import PersonOutlinedIcon from '@mui/icons-material/PersonOutlined'
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined'
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined'

export interface RegisterFormProps {
  onSuccess: () => void
}

export function RegisterForm({ onSuccess }: RegisterFormProps) {
  const { form, register } = useRegister(onSuccess)
  const [showPassword, setShowPassword] = useState(false)

  return (
    <FormStyled onSubmit={form.handleSubmit(register.onSubmit)}>
      <Controller
        name="firstName"
        control={form.control}
        render={({ field }) => (
          <InputTextField
            {...field}
            error={!!form.formState.errors.firstName}
            helperText={form.formState.errors.firstName?.message}
            autoFocus
            label="Имя"
            placeholder="Лирой"
            variant="outlined"
            size="small"
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <PersonOutlinedIcon />
                  </InputAdornment>
                ),
              },
            }}
          />
        )}
      />

      <Controller
        name="lastName"
        control={form.control}
        render={({ field }) => (
          <InputTextField
            {...field}
            error={!!form.formState.errors.lastName}
            helperText={form.formState.errors.lastName?.message}
            label="Фамилия"
            placeholder="Дженкинс"
            variant="outlined"
            size="small"
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <PersonOutlinedIcon />
                  </InputAdornment>
                ),
              },
            }}
          />
        )}
      />

      <Controller
        name="email"
        control={form.control}
        render={({ field }) => (
          <InputTextField
            {...field}
            error={!!form.formState.errors.email}
            helperText={form.formState.errors.email?.message}
            label="Почта"
            placeholder="ljenkins777@example.com"
            variant="outlined"
            size="small"
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
                    disableRipple
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

      <Controller
        name="confirmPassword"
        control={form.control}
        render={({ field }) => (
          <InputTextField
            {...field}
            type={showPassword ? 'text' : 'password'}
            label="Подтверждение"
            placeholder="Повторите пароль"
            variant="outlined"
            size="small"
            error={!!form.formState.errors.confirmPassword}
            helperText={form.formState.errors.confirmPassword?.message}
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
        <FormErrorStyled>
          {!!register.serverError && `${register.serverError}`}
        </FormErrorStyled>
        {/* TODO: поменять на кнопку из UI-KIT когда будет готова */}
        <FormSubmitStyled disabled={!form.formState.isValid}>
          Зарегистрироваться
        </FormSubmitStyled>
      </FormSubmitWrapper>
    </FormStyled>
  )
}
