import { memo } from 'react'
import PersonOutlineIcon from '@mui/icons-material/PersonOutline'
import {
  AvatarWrapper,
  AvatarImage,
  DefaultAvatar,
  AvatarLetter,
} from './Avatar.styles'
import { formatUserName, getUserInitials } from '@/entities/user/utils'

export type AvatarSize = 'm' | 'l'

type AvatarProps = {
  username?: {
    lastName?: string | null
    firstName?: string | null
    displayName?: string | null
    email?: string | null
  } | null
  size?: AvatarSize
  avatarUrl?: string | null
}

type AvatarContentProps = Omit<AvatarProps, 'size'>

const AvatarContent = ({ username, avatarUrl }: AvatarContentProps) => {
  // ТП-63: без пользователя — силуэт (паттерн Jira/Linear «Unassigned»),
  // а не технический символ «?».
  if (!username)
    return (
      <DefaultAvatar title="Не назначено" aria-label="Не назначено">
        <PersonOutlineIcon sx={{ fontSize: '70%' }} />
      </DefaultAvatar>
    )

  const fullName = formatUserName(username)
  const initials = getUserInitials(username)

  if (avatarUrl) return <AvatarImage src={avatarUrl} alt={fullName} />
  if (!initials || initials === '?')
    return (
      <DefaultAvatar title={fullName} aria-label={fullName}>
        <PersonOutlineIcon sx={{ fontSize: '70%' }} />
      </DefaultAvatar>
    )
  return <AvatarLetter title={fullName}>{initials}</AvatarLetter>
}

export const Avatar = memo(
  ({ username, avatarUrl, size = 'm' }: AvatarProps) => {
    return (
      <AvatarWrapper size={size}>
        <AvatarContent username={username} avatarUrl={avatarUrl} />
      </AvatarWrapper>
    )
  },
)
