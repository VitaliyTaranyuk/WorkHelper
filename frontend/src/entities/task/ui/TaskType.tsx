import type { ITaskCard } from '../types'
import { TASK_TYPE_META } from '../typeMeta'
import { TaskTypeWrapper } from './styles'

type TaskTypeProps = {
  taskType: ITaskCard['taskType']
}

/**
 * Иконка типа задачи. Подпись — в `title`: типов больше двух (задача, баг,
 * исследование, история), и по одной иконке они уже не читаются однозначно.
 */
export const TaskType = ({ taskType }: TaskTypeProps) => {
  const { label, Icon } = TASK_TYPE_META[taskType] ?? TASK_TYPE_META.TASK

  return (
    <TaskTypeWrapper title={label} aria-label={label}>
      <Icon
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
          color: '#888888',
        }}
      />
    </TaskTypeWrapper>
  )
}
