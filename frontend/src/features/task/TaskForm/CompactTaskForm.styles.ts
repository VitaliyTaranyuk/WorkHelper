import styled from '@emotion/styled'
import { ACTIVE_COLOR, PRIORITY_COLOR } from './contants'
import type { TaskPriority } from '@/entities/task/types'

export const StyledRadioLabel = styled.label`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
`

export const DateAndCreatorBlock = styled.div`
  display: flex;
  position: absolute;
  bottom: 0;
  right: 0;
`

export function getPriorityChipSx(priority: TaskPriority, selected: boolean) {
  const base = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    userSelect: 'none',
    borderRadius: '6px',
    height: '24px',
    width: '61px',
    borderWidth: 1,
    borderStyle: 'solid',
    color: 'rgba(49, 49, 49, 1)',
    fontSize: '12px',
    fontWeight: 400,
    transition: 'all 120ms ease',
  }

  const schemes = {
    LOW: {
      rest: {
        borderColor: PRIORITY_COLOR.LOW,
        backgroundColor: PRIORITY_COLOR.LOW,
      },
      active: {
        borderColor: ACTIVE_COLOR,
        backgroundColor: PRIORITY_COLOR.LOW,
      },
    },
    MEDIUM: {
      rest: {
        borderColor: PRIORITY_COLOR.MEDIUM,
        backgroundColor: PRIORITY_COLOR.MEDIUM,
      },
      active: {
        borderColor: ACTIVE_COLOR,
        backgroundColor: PRIORITY_COLOR.MEDIUM,
      },
    },
    HIGH: {
      rest: {
        borderColor: PRIORITY_COLOR.HIGH,
        backgroundColor: PRIORITY_COLOR.HIGH,
      },
      active: {
        borderColor: ACTIVE_COLOR,
        backgroundColor: PRIORITY_COLOR.HIGH,
      },
    },
  } as const

  const palette = schemes[priority]

  return {
    ...base,
    ...(selected ? palette.active : palette.rest),
  }
}
