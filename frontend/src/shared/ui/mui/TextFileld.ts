import { TextField as MUITextField, styled } from '@mui/material'
import { COLOR, TEXT_STYLES } from '../theme/constants'

export const TextField = styled(MUITextField)({
  '& .MuiInputBase-root': {
    borderRadius: '12px',
    backgroundColor: 'var(--wt-field)',

    '& .MuiInputBase-input': {
      height: '40px',
      ...TEXT_STYLES.body,
      boxSizing: 'border-box',
    },
    '& fieldset': { borderColor: 'var(--wt-field)' },
    '&:hover fieldset': { borderColor: COLOR.main[500] },
    '&.Mui-focused fieldset': {
      borderColor: COLOR.main[500],
      borderWidth: 1.5,
    },
  },
})
