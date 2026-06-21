import { Typography } from '@mui/material'
import { COLOR } from '../theme/constants'

// TODO: возможно стоит переделать
export const FormCaption: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  return (
    <Typography
      variant="caption"
      color={COLOR.text.tertiary}
      component="label"
      height={'15px'}
    >
      {children}
    </Typography>
  )
}
