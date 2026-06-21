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
    <Card>
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
        <TaskTitle onClick={props.onTitleClick}>{props.title}</TaskTitle>
      </Footer>
    </Card>
  )
}
