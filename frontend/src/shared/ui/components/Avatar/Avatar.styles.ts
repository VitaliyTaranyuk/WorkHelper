import styled from '@emotion/styled'
import type { AvatarSize } from './Avatar'

const AVATAR_SIZE: Record<AvatarSize, string> = {
  m: '24px',
  l: '36px',
}

export const AvatarWrapper = styled.span<{ size: AvatarSize }>`
  display: inline-flex;
  width: ${({ size }) => AVATAR_SIZE[size]};
  height: ${({ size }) => AVATAR_SIZE[size]};
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
`

export const AvatarLetter = styled.span`
  width: 100%;
  height: 100%;

  display: flex;
  align-items: center;
  justify-content: center;

  background-color: rgba(119, 97, 230, 1);
  font-size: 14px;
  font-weight: 400;
  line-height: 18px;
  letter-spacing: 0%;
  color: rgba(245, 245, 245, 1);
`

export const AvatarImage = styled.img<{ src?: string }>`
  width: 100%;
  height: 100%;
  background-image: url(${({ src }) => src});
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
`

export const DefaultAvatar = styled.span`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  background: transparent;
  border: 1px solid #7761e6;
  border-radius: 100px;
  color: #7761e6;
  font-weight: 600;
`
