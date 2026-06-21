import { TextField, styled as MUIStyled } from '@mui/material'
import styled from '@emotion/styled'
import { COLOR } from '@/shared/ui/theme/constants'

export const FinishDateBlock = styled.div`
  display: flex;
  position: absolute;
  bottom: -2px;
  right: 0;
`

export const StyledTextField = MUIStyled(TextField)({
  '& .MuiInputBase-root': {
    borderRadius: '12px',
    backgroundColor: '#F7F7FA',

    '& .MuiInputBase-input': {
      height: '40px',
      fontSize: '14px',
      boxSizing: 'border-box',
    },
    '& fieldset': { borderColor: '#F7F7FA' },
    '&:hover fieldset': { borderColor: COLOR.main[500] },
    '&.Mui-focused fieldset': {
      borderColor: COLOR.main[500],
      borderWidth: 1.5,
    },
  },
})
