import { COLOR } from '@/shared/ui/theme/constants'
import { styled } from '@mui/material/styles'
import Switch from '@mui/material/Switch'

export const AuthSwitch = styled(Switch)({
  position: 'relative',
  width: 'auto',
  height: 'auto',
  padding: 0,

  '&:before': {
    position: 'absolute',
    content: '"Авторизация"',
    left: 0,
    color: COLOR.text.secondary,
    fontWeight: 600,
    zIndex: 2,
    alignSelf: 'center',
    width: '51%',
    padding: 'inherit',
    textAlign: 'center',
    pointerEvents: 'none',
  },

  '&::after': {
    content: '"Регистрация"',
    position: 'absolute',
    right: 0,
    color: COLOR.text.secondary,
    fontWeight: 600,
    zIndex: 2,
    alignSelf: 'center',
    width: '51%',
    padding: 'inherit',
    textAlign: 'center',
    pointerEvents: 'none',
  },

  '& .MuiButtonBase-root': {
    width: '50%',
    height: '100%',
    padding: 'inherit',
    '&:hover': {
      backgroundColor: 'transparent',
    },

    '& .MuiSwitch-thumb': {
      height: 'auto',
      alignSelf: 'stretch',
      margin: '3px',
      width: '100%',
      borderRadius: '9px',
    },
  },

  '& .MuiSwitch-track': {
    backgroundColor: COLOR.background[200],
    opacity: 1,
    height: '2.625rem',
    borderRadius: '12px',
    padding: '0.5rem',
  },

  '& .MuiButtonBase-root.Mui-checked': {
    transform: 'translate(100%)',
    '&:hover': {
      backgroundColor: 'transparent',
    },
    '& .MuiSwitch-thumb': {
      backgroundColor: COLOR.background[50],
    },
  },
  '& .MuiButtonBase-root.Mui-checked+.MuiSwitch-track': {
    backgroundColor: COLOR.background[200],
    opacity: 1,
  },
})
