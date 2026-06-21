import { Link } from '@tanstack/react-router'
import { Stack } from '@mui/material'

import {
  FormStyled,
  FormSubmitStyled,
  FormSubmitWrapper,
} from './form/Form.styles'
import {
  AuthPageStyled,
  AuthWelcomeStyled,
  AuthFormContainerStyled,
} from './AuthPage.styles'

export function SuccessRegisteredPage({ onClick }: { onClick: () => void }) {
  return (
    <AuthPageStyled>
      <AuthFormContainerStyled>
        <FormStyled>
          <AuthWelcomeStyled>
            <h1>
              Добро пожаловать
              <br />в WorkTask!
            </h1>
          </AuthWelcomeStyled>
          <div style={{ display: 'grid', gap: 12 }}>
            <Stack
              flexDirection={'column'}
              justifyContent={'center'}
              sx={{ textAlign: 'center' }}
              alignContent={'center'}
            >
              <span>Спасибо за регистрацию!</span>
              <span>
                После подтверждения почты вы сможете войти в приложение
              </span>
            </Stack>
            <FormSubmitWrapper>
              <Link to="/login" onClick={onClick}>
                <FormSubmitStyled as="button" type="button">
                  На страницу входа
                </FormSubmitStyled>
              </Link>
            </FormSubmitWrapper>
          </div>
        </FormStyled>
      </AuthFormContainerStyled>
    </AuthPageStyled>
  )
}
