import { COLOR } from '@/shared/ui/theme/constants'
import { Button, Menu, styled } from '@mui/material'

export const MenuButton = styled(Button)({
  position: 'absolute',
  right: 0,
  minWidth: 0,
  width: '36px',
  height: '36px',
})

export const PopupMenu = styled(Menu)({
  transform: 'translateY(5px)',
  '& .MuiList-root': {
    backgroundColor: '#FAFAFA',
  },

  '& .MuiButtonBase-root.logout': {
    color: COLOR.text.negative,
  },
})
