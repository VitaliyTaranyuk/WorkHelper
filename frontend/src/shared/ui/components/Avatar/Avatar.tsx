import { memo } from 'react'
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
  if (!username) return <DefaultAvatar>{'?'}</DefaultAvatar>

  const fullName = formatUserName(username)
  const initials = getUserInitials(username)

  if (avatarUrl) return <AvatarImage src={avatarUrl} alt={fullName} />
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
