import { COLOR } from '@/shared/ui/theme/constants'
import { styled } from '@mui/material/styles'
import TextField from '@mui/material/TextField'

export const InputTextField = styled(TextField)({
  fontSize: 14,
  borderRadius: '12px',

  '& .MuiFormLabel-root': {
    position: 'relative',
    fontSize: '0.75rem',
    color: COLOR.text.secondary,
    transform: 'translateY(0)',
    '&.Mui-focused': {
      color: COLOR.text.secondary,
    },
    '&.Mui-error': {
      color: COLOR.text.negative,
    },
  },
  '& .MuiFormHelperText-root.Mui-error': {
    fontSize: '0.7rem',
    position: 'absolute',
    right: 0,
    margin: 0,
    color: COLOR.text.negative,
  },

  '& .MuiInputBase-root': {
    fontSize: '0.875rem',
    borderRadius: 'inherit',
    height: '38px',
    padding: '0 12px',
    backgroundColor: COLOR.background[200],
    color: COLOR.text.primary,
    '& .MuiInputBase-input': {
      lineHeight: 1.5,
      height: 'auto',
      padding: 0,
    },
    '& .MuiButtonBase-root': {
      padding: 0,
    },
    '& .MuiSvgIcon-root': {
      fontSize: '0.875rem',
      width: '1.1rem',
      height: '1.1rem',
    },

    '& fieldset': {
      border: 'none',
      '& legend': {
        width: 0,
      },
    },

    '&.Mui-error': {
      '& fieldset': {
        border: `1px solid ${COLOR.text.negative}`,
      },
    },

    '&:hover fieldset': {
      border: '1px solid #7761E6',
    },
    '&.Mui-focused fieldset': {
      border: `1px solid ${COLOR.main[500]}`,
    },
  },
})
