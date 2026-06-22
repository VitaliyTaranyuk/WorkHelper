import { ButtonWithoutStyles } from '@/shared/ui/Button'
import { COLOR, TEXT_STYLES } from '@/shared/ui/theme/constants'
import styled from '@emotion/styled'

export const Card = styled.div`
  width: 252px;
  min-height: 78px;
  display: flex;
  flex-direction: column;
  padding: 8px 10px;
  background-color: ${COLOR.background[200]};
  border-radius: 16px;
  font-size: 12px;
  cursor: pointer;
  transition:
    transform 0.12s ease,
    box-shadow 0.12s ease;

  :hover {
    transform: scale(1.03);
    box-shadow: 0 6px 16px rgba(15, 23, 42, 0.16);
  }
`

export const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2px;
`

export const TaskTitle = styled(ButtonWithoutStyles)`
  word-wrap: break-word;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-align: left;

  ${TEXT_STYLES.body}
  color: ${COLOR.text.primary};

  // TODO: уточнить у дизайна на счет ховера заголовка
  :hover {
    opacity: 0.9;
  }
`

export const Footer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`

export const WorkEstimation = styled.span`
  ${TEXT_STYLES.storyPoint}
  color: ${COLOR.text.secondary};
`

export const Wrapper = styled.div<{ gap?: string }>`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: ${({ gap }) => gap};
`
