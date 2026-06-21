import {
  MenuItem as MUIMenuItem,
  Select as MUISelect,
  styled,
} from '@mui/material'
import { COLOR, TEXT_STYLES } from '../theme/constants'

export const Select = styled(MUISelect)({
  height: '40px',
  fontSize: '14px',
  '& .MuiOutlinedInput-notchedOutline': {
    borderColor: 'transparent',
  },
  '&:hover .MuiOutlinedInput-notchedOutline': {
    borderColor: COLOR.main[500],
  },
  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
    borderColor: COLOR.main[500],
    borderWidth: 1.5,
  },
  borderRadius: '12px',
  backgroundColor: '#F7F7FA',
})

export const MenuItem = styled(MUIMenuItem)({
  ...TEXT_STYLES.body,
})
