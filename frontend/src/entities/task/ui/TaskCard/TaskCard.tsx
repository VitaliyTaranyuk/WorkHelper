import { Avatar } from '@/shared/ui/components/Avatar'
import {
  Card,
  Header,
  TaskTitle,
  Footer,
  WorkEstimation,
  Wrapper,
} from './TaskCard.styles'
import type { ITaskCard } from '../../types'
import { TaskType } from '../TaskType'
import { TaskCode } from '../styles'

type TaskCardProps = ITaskCard & {
  onTitleClick: () => void
}

export const TaskCard = (props: TaskCardProps) => {
  return (
    <Card
      onClick={props.onTitleClick}
      role="button"
      tabIndex={0}
      style={{ position: 'relative' }}
    >
      <Header>
        <Wrapper gap={'4px'}>
          <TaskType taskType={props.taskType} />
          <TaskCode priority={props.priority}>{props.code}</TaskCode>
        </Wrapper>
        <Wrapper gap={'4px'}>
          {!!props.estimation && (
            <WorkEstimation>{props.estimation}</WorkEstimation>
          )}
          <Avatar
            username={props.assignee}
            avatarUrl={props.assignee?.avatarUrl}
          />
        </Wrapper>
      </Header>
      <Footer>
        <TaskTitle as="span">{props.title}</TaskTitle>
      </Footer>
      {/* ТП-45: ненавязчивая точка «есть комментарий, ждущий ответа» */}
      {props.awaitingReply && (
        <span
          title="Есть комментарий, ожидающий вашего ответа"
          aria-label="Есть комментарий, ожидающий вашего ответа"
          style={{
            position: 'absolute',
            right: 8,
            bottom: 8,
            width: 8,
            height: 8,
            borderRadius: '50%',
            backgroundColor: '#ED6C02',
          }}
        />
      )}
    </Card>
  )
}
