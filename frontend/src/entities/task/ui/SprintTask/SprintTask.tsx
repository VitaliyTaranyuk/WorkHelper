import type { ITaskCard } from '../../types'
import { TaskType } from '../TaskType'
import { TaskCode } from '../styles'
import { Avatar } from '@/shared/ui/components/Avatar'
import iconArrowWithTail from '@/shared/assets/icons/arrow-with-tail.svg'
import iconEditSmall from '@/shared/assets/icons/edit-small.svg'
import { IconImg } from '@/shared/ui/IconImg'
import {
  IconButton,
  LeftBlock,
  SprintTaskWrapper,
  TaskEstimation,
  TaskTitle,
} from './SprintTask.styled'
import { truncateText } from '@/shared/utils/text'
import { MAX_TITLE_LENGTH } from './constants'
import { memo } from 'react'
import Checkbox from '@mui/material/Checkbox'

export type SprintTaskProps = {
  task: ITaskCard
  onTitleClick: (task: ITaskCard) => void
  onEditClick: (task: ITaskCard) => void
  onMoveToSprintClick: (props: { task: ITaskCard; anchor: HTMLElement }) => void
  /**
   * T-309: множественный выбор. Чекбокс появляется только когда родитель
   * передал обработчик — в остальных местах строка выглядит как прежде.
   * `range` = клик с Shift: выбрать диапазон от предыдущей отметки.
   */
  selected?: boolean
  onSelectChange?: (props: { task: ITaskCard; range: boolean }) => void
}

export const SprintTask = memo(function ({
  task,
  onTitleClick,
  onEditClick,
  onMoveToSprintClick,
  selected = false,
  onSelectChange,
}: SprintTaskProps) {
  const taskTitle = truncateText(task.title, MAX_TITLE_LENGTH)

  return (
    <SprintTaskWrapper>
      {onSelectChange && (
        <Checkbox
          size="small"
          checked={selected}
          inputProps={{
            'aria-label': `Выбрать задачу ${task.code}`,
          }}
          sx={{ p: 0.5, mr: 0.5 }}
          // onClick, а не onChange: нужен shiftKey, которого в событии
          // изменения нет. Всплытие останавливаем — строка кликабельна сама
          // по себе (открытие задачи) и перетаскивается.
          onClick={(e) => {
            e.stopPropagation()
            onSelectChange({ task, range: e.shiftKey })
          }}
          onMouseDown={(e) => e.stopPropagation()}
        />
      )}
      <TaskType taskType={task.taskType} />
      <TaskCode priority={task.priority}>{task.code}</TaskCode>
      <TaskTitle onClick={() => onTitleClick(task)}>{taskTitle}</TaskTitle>
      <LeftBlock>
        <Avatar username={task.assignee} />
        <TaskEstimation>
          {task.estimation ? task.estimation : null}
        </TaskEstimation>
        <IconButton onClick={() => onEditClick(task)}>
          <IconImg iconAlt="редактировать задачу" iconUrl={iconEditSmall} />
        </IconButton>
        <IconButton
          style={{ marginLeft: '32px' }}
          onClick={(e) =>
            onMoveToSprintClick({ task, anchor: e.currentTarget })
          }
        >
          <IconImg
            iconAlt="перенести в другой спринт"
            iconUrl={iconArrowWithTail}
          />
        </IconButton>
      </LeftBlock>
    </SprintTaskWrapper>
  )
})

type ShorSprintTask = {
  task: ITaskCard
  onTitleClick: (taskId: ITaskCard['id']) => void
  className?: string
}

export const ShorSprintTask = memo(function ({
  task,
  onTitleClick,
  className,
}: ShorSprintTask) {
  const taskTitle = truncateText(task.title, MAX_TITLE_LENGTH)

  return (
    <SprintTaskWrapper className={className}>
      <TaskType taskType={task.taskType} />
      <TaskCode priority={task.priority}>{task.code}</TaskCode>
      <TaskTitle onClick={() => onTitleClick(task.id)}>{taskTitle}</TaskTitle>
      <LeftBlock style={{ gap: '10px' }}>
        <Avatar username={task.assignee} />
        <TaskEstimation style={{ width: '32px' }}>
          {task.estimation ? task.estimation : null}
        </TaskEstimation>
      </LeftBlock>
    </SprintTaskWrapper>
  )
})
