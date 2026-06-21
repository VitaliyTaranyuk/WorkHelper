import { Button as MUIButton, styled as MUIStyled } from '@mui/material'
import styled from '@emotion/styled'
import { COLOR, TEXT_STYLES } from './theme/constants'
import isPropValid from '@emotion/is-prop-valid'

// TODO: собрать единую палитру цветов
const DISABLED_BACKGROUND_COLOR = 'rgba(203, 203, 250, 1)'
const DISABLED_TEXT_COLOR = 'rgba(159, 154, 243, 1)'

export const MUIPrimaryButton = MUIStyled(MUIButton)({
  fontWeight: 400,
  fontSize: '16px',
  borderRadius: '12px',
  backgroundColor: 'rgba(119, 97, 230, 1)',
  color: 'rgba(245, 245, 245, 1)',
  textTransform: 'none',
  border: '1px solid rgba(159, 154, 243, 1)',
  boxShadow: 'none',
  '&:hover': {
    boxShadow: 'none',
  },

  '&[disabled]': {
    borderColor: DISABLED_BACKGROUND_COLOR,
    backgroundColor: DISABLED_BACKGROUND_COLOR,
    color: DISABLED_TEXT_COLOR,
  },
})

export const ButtonWithoutStyles = styled.button`
  margin: 0;
  padding: 0;
  background: none;
  border: none;
`

export type ButtonProps = {
  size: 'small' | 'medium' | 'large'
  variant: 'primary' | 'secondary'
}

const BUTTON_HEIGHT_BY_SIZE: Record<ButtonProps['size'], string> = {
  large: '42px',
  medium: '36px',
  small: '28px',
} as const

const BUTTON_COLOR_BY_TYPE = {
  primary: {
    base: {
      backgroundColor: COLOR.main[500],
      borderColor: COLOR.main[500],
      color: COLOR.text.light,
    },
    hover: {
      borderColor: COLOR.main[600],
      backgroundColor: COLOR.main[600],
    },

    active: {
      borderColor: COLOR.main[700],
      backgroundColor: COLOR.main[700],
    },

    disabled: {
      borderColor: COLOR.main[200],
      backgroundColor: COLOR.main[200],
      color: COLOR.main[350],
    },
  },
  secondary: {
    base: {
      backgroundColor: COLOR.main[75],
      borderColor: COLOR.main[350],
      color: COLOR.text.active,
    },
    hover: {
      borderColor: COLOR.main[350],
      backgroundColor: COLOR.main[150],
    },

    active: {
      borderColor: COLOR.main[350],
      backgroundColor: COLOR.main[300],
    },

    disabled: {
      borderColor: COLOR.main[75],
      backgroundColor: COLOR.main[75],
      color: COLOR.main[250],
    },
  },
} as const

const BUTTON_PROPS = ['size', 'type']

export const Button = styled('button', {
  shouldForwardProp: (prop) =>
    isPropValid(prop) && !BUTTON_PROPS.includes(prop),
})<{ variant?: ButtonProps['variant']; size?: ButtonProps['size'] }>`
  // TODO: сделать все кнопки по UI-KIT
  border: 1px solid transparent;
  ${({ variant = 'primary' }) => BUTTON_COLOR_BY_TYPE[variant].base}

  padding: 8px 12px;

  height: ${({ size = 'large' }) => BUTTON_HEIGHT_BY_SIZE[size]};
  box-sizing: border-box;
  border-radius: 12px;

  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;

  transition: all 0.3s ease-in;

  ${({ size = 'large' }) =>
    size === 'small' ? TEXT_STYLES.button.small : TEXT_STYLES.button.normal};

  :hover {
    ${({ variant = 'primary' }) => BUTTON_COLOR_BY_TYPE[variant].hover}
  }

  :active {
    ${({ variant = 'primary' }) => BUTTON_COLOR_BY_TYPE[variant].active}
  }

  :disabled {
    ${({ variant = 'primary' }) => BUTTON_COLOR_BY_TYPE[variant].disabled}
  }
`
