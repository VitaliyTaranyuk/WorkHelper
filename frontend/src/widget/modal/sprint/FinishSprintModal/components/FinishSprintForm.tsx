import type { ITaskCard } from '@/entities/task/types'
import { FormCaption } from '@/shared/ui/components/FormCaption'
import { Stack } from '@mui/material'
import {
  formatDateForBackend,
  formatToLocaleDate,
  getDifferenceInDays,
} from '@/shared/utils/date'
import type { FinishingSprint } from '../type'
import { MenuItem, Select } from '@/shared/ui/mui/Select'
import type { SprintMin } from '@/entities/sprint/type'
import { truncateText } from '@/shared/utils/text'
import { SPRINT_TITLE_MAX } from '@/entities/sprint/constants'
import {
  SprintSelectPlaceholder,
  StyledShortSprintTask,
  TaskBlockTitle,
  TasksList,
} from './FinishSprintForm.styles'
import { FormItem } from '@/shared/ui/TextFormItem'

export type ExternalSprintDataProps = {
  sprint: FinishingSprint
}

type FinishSprintFormProps = ExternalSprintDataProps & {
  availableSprints: SprintMin[]
  notFinishedTasks: ITaskCard[]

  onSubmit: () => void
  form: {
    selectedSprintId: string
    setSelectedSprintId: React.Dispatch<React.SetStateAction<string>>
  }
}

export function FinishSprintForm(props: FinishSprintFormProps) {
  const { form } = props
  const finishingDate = formatDateForBackend(new Date())
  const redirectPath = encodeURIComponent(window.location.pathname)

  return (
    <>
      <Stack
        gap={'12px'}
        position={'relative'}
        paddingBottom={'19px'}
        component="form"
        onSubmit={props.onSubmit}
      >
        <Stack gap={'16px'} direction={'row'}>
          <FormItem
            caption="Дата старта"
            value={formatToLocaleDate({ date: props.sprint.startDate })}
          />
          <FormItem
            caption="Дата завершения"
            value={formatToLocaleDate({ date: finishingDate })}
          />
          <FormItem
            caption="Общая оценка"
            value={`${getTaskSumEstimation(props.sprint.tasks)}`}
          />
          <FormItem
            caption="Длительность"
            value={`${getDifferenceInDays(props.sprint.startDate, finishingDate)}`}
          />
        </Stack>

        {!!props.sprint.goal && (
          <FormItem caption="Цели" value={props.sprint.goal} />
        )}
      </Stack>
      {!!props.notFinishedTasks.length && (
        <Stack gap={'12px'} marginTop={'20px'}>
          <TaskBlockTitle>
            Выберите куда перенести незавершенные задачи
          </TaskBlockTitle>
          <Select
            value={form.selectedSprintId}
            onChange={(e) => form.setSelectedSprintId(String(e.target.value))}
            aria-placeholder="Выберите спринт"
            displayEmpty
            renderValue={(selected) => {
              if (!selected)
                return (
                  <SprintSelectPlaceholder>
                    Выберите спринт
                  </SprintSelectPlaceholder>
                )

              const selectedSprint = props.availableSprints.find(
                (sprint) => sprint.id === selected,
              )
              return <>{selectedSprint!.name}</>
            }}
          >
            {props.availableSprints.map((availableSprint) => (
              <MenuItem value={availableSprint.id}>
                {truncateText(availableSprint.name, SPRINT_TITLE_MAX)}
              </MenuItem>
            ))}
          </Select>
          <Stack width={'100%'} gap={'4px'}>
            <FormCaption>Задачи</FormCaption>
            <TasksList>
              {props.notFinishedTasks.map((task) => (
                <li key={task.id}>
                  <StyledShortSprintTask
                    task={task}
                    onTitleClick={() =>
                      window.open(
                        `/task/${task.code}?redirect=${redirectPath}`,
                        '_blank',
                        'noopener,noreferrer',
                      )
                    }
                  />
                </li>
              ))}
            </TasksList>
          </Stack>
        </Stack>
      )}
    </>
  )
}

function getTaskSumEstimation(tasks: ITaskCard[] = []) {
  return tasks.reduce((acc, task) => acc + (task.estimation || 0), 0)
}
