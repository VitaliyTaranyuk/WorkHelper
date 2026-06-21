import styled from '@emotion/styled'
import { IconImg } from '@/shared/ui/IconImg'
import { COLOR, TEXT_STYLES } from '@/shared/ui/theme/constants'

export const FilterButton = styled.button<{ isActive: boolean }>`
  color: ${(props) =>
    props.isActive ? COLOR.text.light : COLOR.text.tertiary};
  ${TEXT_STYLES.caption}
  height: 19px;
  background-color: ${(props) =>
    props.isActive ? COLOR.main[500] : COLOR.background[150]};
  border-radius: 100px;
  padding: 2px 10px;
  border: none;

  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
`
export const ListContainer = styled.ul`
  display: flex;
  gap: 4px;
  margin-bottom: 12px;
`

export const FilterIcon = styled(IconImg)<{ isOpen: boolean }>`
  transition: transform 0.3s ease-in-out;
  transform: ${(props) => (props.isOpen ? 'rotate(0deg)' : 'rotate(180deg)')};
`
export const DropdownList = styled.ul`
  min-width: 120px;
  position: absolute;
  color: ${COLOR.text.tertiary};
  background-color: ${COLOR.background[150]};
  border: none;
  border-radius: 4px;
  padding: 8px;
  margin-top: 4px;
  z-index: 1;
`
export const DropdownItem = styled.li<{ isActive: boolean }>`
  color: ${(props) =>
    props.isActive ? COLOR.text.light : COLOR.text.tertiary};
  background-color: ${(props) =>
    props.isActive ? COLOR.main[500] : COLOR.background[150]};
  ${TEXT_STYLES.caption}
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 4px;
  margin-bottom: 4px;

  &:hover {
    opacity: 0.8;
  }
`
