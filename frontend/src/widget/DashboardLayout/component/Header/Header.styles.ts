import styled from '@emotion/styled'
import { LEFT_SIDE_WIDTH_PX } from '../../constants'
import { VerticalLine } from '@/shared/ui/Line'

const HEADER_PADDING_TOP_PX = '35px'
const HEADER_HEIGHT_PX = '85px'
// Согласовано с Sidebar: при ≤640px сайдбар сжимается до 56px (COLLAPSE_BP /
// COLLAPSED_WIDTH_PX). Раньше боковой блок шапки оставался 224px и на телефоне
// выталкивал колокольчик и меню пользователя за экран (ТП-134, F-011).
const COLLAPSE_BP = '640px'
const COLLAPSED_SIDE_WIDTH_PX = '56px'

export const StyledVerticalLine = styled(VerticalLine)`
  height: ${HEADER_HEIGHT_PX};
  position: absolute;
  top: 0;
  left: ${LEFT_SIDE_WIDTH_PX};

  @media (max-width: ${COLLAPSE_BP}) {
    left: ${COLLAPSED_SIDE_WIDTH_PX};
  }
`

export const TopBlock = styled.header`
  position: relative;
  padding-top: ${HEADER_PADDING_TOP_PX};
  height: ${HEADER_HEIGHT_PX};
  width: 100%;
  display: flex;
  align-items: center;
`

export const HeaderSideBlock = styled.div`
  width: ${LEFT_SIDE_WIDTH_PX};
  flex-shrink: 0;
  display: flex;
  align-items: center;
  padding: 0 12px;
  min-width: 0;

  @media (max-width: ${COLLAPSE_BP}) {
    width: ${COLLAPSED_SIDE_WIDTH_PX};
    padding: 0 4px;
  }
`
export const HeaderMainBlock = styled.div`
  flex-grow: 1;
  display: flex;
  align-items: center;
  width: 100%;
  padding-left: 20px;
  padding-right: 20px;
  gap: 20px;
  min-width: 0;

  @media (max-width: ${COLLAPSE_BP}) {
    padding-left: 8px;
    padding-right: 8px;
    gap: 8px;
  }
`

