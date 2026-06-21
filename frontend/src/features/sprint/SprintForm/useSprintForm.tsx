import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { sprintFormSchema } from './sprintFormSchema'
import { getDifferenceInDays, makeDateObj } from '@/shared/utils/date'

export type FormValues = z.infer<typeof sprintFormSchema>

export interface EditFormSprint {
  name: string
  goal?: string
  // @format date
  startDate?: string
  // @format date
  endDate?: string
}

const DEFAULT_SPRINT_FORM_VALUE = {
  name: '',
  goal: '',
  duration: null,
  startDate: null,
}

export function useSprintForm({ sprint }: { sprint?: EditFormSprint } = {}) {
  const defaultValues = sprint
    ? mapSprintInfoToFormValues(sprint)
    : DEFAULT_SPRINT_FORM_VALUE

  const form = useForm<FormValues>({
    resolver: zodResolver(sprintFormSchema),
    mode: 'onTouched',
    reValidateMode: 'onChange',
    defaultValues,
  })

  return form
}

function mapSprintInfoToFormValues(sprint: EditFormSprint): FormValues {
  let duration = null

  if (sprint.startDate && sprint.endDate) {
    duration = getDifferenceInDays(sprint.startDate, sprint.endDate)
  }

  return {
    ...sprint,
    startDate: sprint.startDate ? Number(makeDateObj(sprint.startDate)) : null,
    duration,
  }
}
