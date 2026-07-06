import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { compactTaskFormSchema, createTaskFormSchema } from './taskFormSchema'
import { zodResolver } from '@hookform/resolvers/zod'
import type { ITaskCard } from '@/entities/task/types'

export type FormValues = z.infer<typeof compactTaskFormSchema>

export type CompactEditFormTask = ITaskCard & {
  description?: string
  sprintId: string
}

export const NOT_ASSIGNED_OPTION = {
  value: '-1',
  label: 'Не назначен',
}

export function useCreateTaskForm({
  defaultSprintId,
}: {
  defaultSprintId: string
}) {
  const form = useForm<FormValues>({
    // ТП-147: при создании название можно не указывать — оно сформируется
    // из описания (prepareTaskCard); редактирование живёт на строгой схеме.
    resolver: zodResolver(createTaskFormSchema),
    mode: 'onTouched',
    reValidateMode: 'onChange',
    defaultValues: {
      taskTitle: '',
      description: '',
      priority: 'MEDIUM',
      type: 'TASK',
      assignee: NOT_ASSIGNED_OPTION.value,
      sprint: defaultSprintId,
      status: null,
    },
  })

  return form
}

export function useEditTaskForm({ task }: { task: CompactEditFormTask }) {
  const form = useForm<FormValues>({
    resolver: zodResolver(compactTaskFormSchema),
    mode: 'onTouched',
    reValidateMode: 'onChange',
    defaultValues: {
      taskTitle: task.title,
      description: task.description || '',
      priority: task.priority,
      type: task.taskType,
      assignee: task.assignee?.id || NOT_ASSIGNED_OPTION.value,
      sprint: task.sprintId,
    },
  })

  return form
}
