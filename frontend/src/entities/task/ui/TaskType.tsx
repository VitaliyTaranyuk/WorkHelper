import iconTask from '@/shared/assets/icons/task.svg'
import iconBug from '@/shared/assets/icons/bug.svg'
import type { ITaskCard } from '../types'
import { TaskTypeWrapper } from './styles'

type TaskTypeProps = {
  taskType: ITaskCard['taskType']
}

export const TaskType = ({ taskType }: TaskTypeProps) => {
  const iconSrc = taskType === 'TASK' ? iconTask : iconBug

  return (
    <TaskTypeWrapper>
      <img
        src={iconSrc}
        alt={taskType}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
        }}
      />
    </TaskTypeWrapper>
  )
}
