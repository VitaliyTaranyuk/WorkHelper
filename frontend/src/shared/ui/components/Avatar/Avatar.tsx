import { memo } from 'react'
import {
  AvatarWrapper,
  AvatarImage,
  DefaultAvatar,
  AvatarLetter,
} from './Avatar.styles'

export type AvatarSize = 'm' | 'l'

type AvatarProps = {
  username?: {
    lastName: string
    firstName: string
  }
  size?: AvatarSize
  avatarUrl?: string | null
}

type AvatarContentProps = Omit<AvatarProps, 'size'>

const AvatarContent = ({ username, avatarUrl }: AvatarContentProps) => {
  if (avatarUrl && username) {
    return (
      <AvatarImage
        src={avatarUrl}
        alt={`${username.lastName} ${username.firstName}`}
      />
    )
  } else if (username) {
    return (
      <AvatarLetter title={`${username.lastName} ${username.firstName}`}>
        {username.lastName[0]}
        {username.firstName[0]}
      </AvatarLetter>
    )
  }

  return <DefaultAvatar>{'?'}</DefaultAvatar>
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
