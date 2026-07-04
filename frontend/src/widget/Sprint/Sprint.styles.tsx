import styled from '@emotion/styled'

import { css } from '@emotion/react'
import { COLOR } from '@/shared/ui/theme/constants'

/*
 * Единая типографика секций «Списка задач» (ТП-61, паттерн group headers
 * Linear/Jira): один размер заголовка для всех групп (спринты, Бэклог,
 * Завершённые), второстепенные подписи — 12px tertiary.
 */

export const SprintContainer = styled.div`
  width: 100%;
  position: relative;
`

export const SprintBlock = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 36px;
  padding: 0 8px 0 4px;

  top: 5px;
  position: sticky;
  z-index: 1;

  border-radius: 8px;
  background-color: ${COLOR.background[500]};

  ::before {
    content: '';
    display: block;
    width: 100%;
    height: 5px;
    position: absolute;
    top: -5px;
    background-color: ${COLOR.background[500]};
  }
`

export const ButtonBlock = styled.div`
  display: flex;
  align-items: center;
  gap: 20px;
`

export const TaskBlock = styled.div<{ isExpanded: boolean }>`
  padding-left: 20px;

  margin-top: 12px;

  transition: all 0.3s ease-in-out;
  overflow: hidden;

  ${({ isExpanded }) =>
    !isExpanded &&
    css`
      height: 0;
      margin-top: 0;
    `}
`

export const TitleBlock = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  cursor: pointer;
  user-select: none;
`

/** Основной текст секции: Бэклог / диапазон дат спринта / имя без дат. */
export const SectionTitle = styled.h2`
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  line-height: 24px;
  color: ${COLOR.text.secondary};
  white-space: nowrap;
`

/** Второстепенная подпись (пользовательское имя спринта) — компактно. */
export const SecondaryName = styled.span`
  font-size: 12px;
  line-height: 16px;
  color: ${COLOR.text.tertiary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
`

export const ControlsBlock = styled.div`
  display: flex;
  flex-shrink: 0;
  justify-content: start;
  align-items: center;
  gap: 16px;
`

export const TaskAmount = styled.p`
  margin: 0;
  font-size: 12px;
  line-height: 16px;
  color: ${COLOR.text.tertiary};
  white-space: nowrap;
`
