import styled from '@emotion/styled'
import { css } from '@emotion/react'
import IconButton from '@mui/material/IconButton'
import { COLOR, TEXT_STYLES } from '@/shared/ui/theme/constants'
import { Link } from '@tanstack/react-router'
import isPropValid from '@emotion/is-prop-valid'

export const TitleText = styled.h3`
  ${css(TEXT_STYLES.headline.h5)}
  /* TODO: уточнить у Алены, что этого цвета нет в UI-KIT */
  color: rgba(136, 136, 136, 1);
  padding: 0 32px;
`

export const EmptyList = styled.span`
  display: inline-block;
  font-size: 16px;
  color: rgba(120, 116, 134, 1);
`

export const StyledIconButton = styled(IconButton)`
  display: flex;
  flex-shrink: 0;
`

export const ProjectBlockContainer = styled.div`
  padding: 0 8px;
  height: 100%;
`

export const ProjectList = styled.ul`
  margin-top: 12px;
  display: flex;
  flex-direction: column;
`

export const SubLink = styled(Link)`
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 18px;
  padding-left: 46px;

  ${css(TEXT_STYLES.headline.h5)};
  color: ${COLOR.text.tertiary};

  &:hover {
    opacity: 0.8;
  }
`

export const SubLinkMuted = styled(SubLink)`
  color: rgba(150, 150, 150, 1);
  font-style: italic;
`

export const SprintStatusDot = styled.span<{ color: string }>`
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
  background-color: ${({ color }) => color};
`

export const ProjectLink = styled(Link, {
  shouldForwardProp: (prop) => isPropValid(prop) && prop !== 'isCurrent',
})<{ isCurrent: boolean }>`
  display: flex;
  align-items: center;
  height: 23px;
  position: relative;
  padding-left: 46px;

  background-color: ${COLOR.background[150]};
  border-radius: 8px;

  ${css(TEXT_STYLES.headline.h5)};

  &::before {
    content: '';
    display: ${({ isCurrent }) => (isCurrent ? 'block' : 'none')};
    width: 6px;
    height: 6px;
    position: absolute;
    top: 50%;
    left: 35px;

    transform: translate(-50%, -50%);

    /* TODO: уточнить у Алены, что этого цвета нет в UI-KIT */
    background-color: rgba(229, 189, 0, 1);
    border-radius: 50%;
  }

  /* TODO: уточнить у Алены по ховеру и клику */
  &:hover {
    opacity: 0.8;
  }

  &:active {
    opacity: 0.7;
  }
`

export const ProjectListItem = styled.li<{ isCurrent?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 4px;

  color: ${COLOR.text.tertiary};
`
