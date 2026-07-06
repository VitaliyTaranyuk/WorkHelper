import { useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { router } from '@/application/router'
import { useCreateTask } from '@/features/task/mutation/useCreateTask'
import { useUpdateTaskStatus } from '@/features/task/mutation/useUpdateTaskStatus'
import { useUpdateTasksSprint } from '@/features/task/mutation/useUpdateTasksSprint'
import { useEditTask } from '@/features/task/mutation/useEditTask'
import { useCreateSprint } from '@/features/sprint/mutation/useCreateSprint'
import { useActivateSprint } from '@/features/sprint/mutation/useActivateSprint'
import { useFinishSprint } from '@/features/sprint/mutation/useFinishSprint'
import { useCreateMeeting, useUpdateMeeting } from '@/features/meeting/useMeetings'
import { toBackendDateTime } from '@/features/meeting/dateTimeFormat'
import { parseMeetToken } from '@/features/meet/meetLink'
import { pickMeeting } from '../core/resolve/meetingPick'
import { workTechApi } from '@/shared/api/endpoint'
import { mapTaskMinDTOToTaskCard } from '@/entities/task/mapDTO'
import type { TaskModelDTO } from '@/data-contracts'
import type {
  NavTarget,
  VoiceContext,
  VoiceServices,
} from '../core/command/types'

/**
 * Проводка голосовых команд к СУЩЕСТВУЮЩИМ действиям приложения (ТП-95 / X1):
 * createTask → useCreateTask (та же мутация, что и UI), navigate → router.
 * Инвариант: голос не ходит в API напрямую (ADR-005).
 */

/** Чистое сопоставление NavTarget → маршрут (тестируется отдельно). */
export function voiceNavPath(
  target: NavTarget,
  projectId: string,
):
  | { to: '/main' }
  | { to: '/project/$projectId/backlog'; params: { projectId: string } }
  | { to: '/project/$projectId/sprint'; params: { projectId: string } }
  | { to: '/project/$projectId/calendar'; params: { projectId: string } }
  | { to: '/settings' }
  | { to: '/task/$code'; params: { code: string } } {
  switch (target.kind) {
    case 'board':
      return { to: '/main' }
    case 'tasks':
      return { to: '/project/$projectId/backlog', params: { projectId } }
    case 'sprint':
      return { to: '/project/$projectId/sprint', params: { projectId } }
    case 'calendar':
      return { to: '/project/$projectId/calendar', params: { projectId } }
    case 'settings':
      return { to: '/settings' }
    case 'task':
      return { to: '/task/$code', params: { code: target.code } }
  }
}

export function useVoiceServices(
  ctx: VoiceContext | null,
): VoiceServices | null {
  const queryClient = useQueryClient()
  const createTask = useCreateTask()
  const updateStatus = useUpdateTaskStatus()
  const updateSprint = useUpdateTasksSprint()
  const editTask = useEditTask()
  const createSprintMut = useCreateSprint()
  const activateSprintMut = useActivateSprint()
  const finishSprintMut = useFinishSprint()
  // Мутация встреч требует projectId на этапе вызова хука; для null-контекста
  // передаём пустую строку — сервис всё равно недоступен (return null ниже).
  const createMeetingMut = useCreateMeeting(ctx?.projectId ?? '')
  const updateMeetingMut = useUpdateMeeting(ctx?.projectId ?? '')

  return useMemo(() => {
    if (!ctx) return null
    const projectId = ctx.projectId
    return {
      createTask: async (input) => {
        const dto: TaskModelDTO = {
          projectId,
          title: input.title,
          taskType: input.taskType,
          priority: input.priority ?? 'MEDIUM',
          ...(input.description ? { description: input.description } : {}),
          ...(input.sprintId ? { sprintId: input.sprintId } : {}),
          ...(input.statusId ? { statusId: input.statusId } : {}),
          ...(input.assignee ? { assignee: input.assignee } : {}),
        }
        const res = await createTask.mutateAsync(dto)
        return { id: res.data.id, code: res.data.code, title: res.data.title }
      },
      navigate: (target) => {
        router.navigate(voiceNavPath(target, projectId))
      },
      setStatus: async (taskId, statusId) => {
        await updateStatus.mutateAsync({ taskId, projectId, statusId })
      },
      setSprint: async (taskId, sprintId) => {
        await updateSprint.mutateAsync({ projectId, sprintId, taskIds: [taskId] })
      },
      findTask: async (code) => {
        try {
          const res = await workTechApi.task.findTaskByCode({ code, projectId })
          const t = mapTaskMinDTOToTaskCard(res.data)
          return {
            id: t.id,
            code: t.code,
            title: t.title,
            statusId: t.status.id,
            sprintId: t.sprintId,
          }
        } catch {
          return null
        }
      },
      // updateTask требует полный DTO (title/priority обязательны) — читаем
      // текущую задачу и мержим изменение (fetch-merge), не теряя других полей.
      patchTask: async (code, changes) => {
        const res = await workTechApi.task.findTaskByCode({ code, projectId })
        const t = mapTaskMinDTOToTaskCard(res.data)
        await editTask.mutateAsync({
          projectId,
          taskId: t.id,
          data: {
            title: changes.title ?? t.title,
            priority: changes.priority ?? t.priority,
            taskType: t.taskType,
            ...('assignee' in changes
              ? { assignee: changes.assignee }
              : t.assignee
                ? { assignee: t.assignee.id }
                : {}),
            ...(changes.description ?? t.description
              ? { description: changes.description ?? t.description }
              : {}),
            ...(t.sprintId ? { sprintId: t.sprintId } : {}),
          },
        })
        return { id: t.id, code: t.code, title: t.title }
      },
      addComment: async (taskId, text) => {
        await workTechApi.task.createComment({
          data: { projectId, taskId, comment: text },
        })
        queryClient.invalidateQueries({ queryKey: ['comments', taskId] })
        queryClient.invalidateQueries({ queryKey: ['tasks', projectId] })
      },
      createSprint: async (name) => {
        await createSprintMut.mutateAsync({ projectId, sprintData: { name } })
      },
      activateSprint: async (sprintId) => {
        await activateSprintMut.mutateAsync({ projectId, sprintId })
      },
      finishSprint: async (sprintId) => {
        await finishSprintMut.mutateAsync({ projectId, sprintId })
      },
      markNotificationsRead: async () => {
        await workTechApi.notification.markAllRead()
        queryClient.invalidateQueries({ queryKey: ['notifications'] })
      },
      createMeeting: async (input) => {
        await createMeetingMut.mutateAsync({
          title: input.title,
          startAt: input.startAt,
          ...(input.endAt ? { endAt: input.endAt } : {}),
        })
      },
      // M5 (ТП-165): открыть идущую/ближайшую встречу со ссылкой; своя
      // видеовстреча — внутри SPA, внешняя (Телемост) — новой вкладкой.
      openMeeting: async (query) => {
        const meetings = (
          await workTechApi.meeting.getMeetings({ projectId })
        ).data
        const picked = pickMeeting(meetings, query, Date.now(), {
          requireLink: true,
        })
        if (!picked)
          return {
            ok: false,
            message: query
              ? `Не нашёл встречу «${query}» со ссылкой на подключение`
              : 'Не нашёл идущей или предстоящей встречи со ссылкой',
          }
        const token = parseMeetToken(picked.link)
        if (token)
          router.navigate({ to: '/meet/$token', params: { token } })
        else window.open(picked.link!, '_blank', 'noopener,noreferrer')
        return { ok: true, message: `Открываю встречу «${picked.title}»` }
      },
      // M5: приглашение = добавление участника в запись встречи — существующая
      // мутация updateMeeting; напоминания/оповещения дальше штатные.
      inviteToMeeting: async (member, meetingQuery) => {
        const meetings = (
          await workTechApi.meeting.getMeetings({ projectId })
        ).data
        const picked = pickMeeting(meetings, meetingQuery, Date.now())
        if (!picked)
          return {
            ok: false,
            message: meetingQuery
              ? `Не нашёл встречу «${meetingQuery}»`
              : 'Не нашёл идущей или предстоящей встречи',
          }
        if (picked.participants.some((p) => p.id === member.id))
          return {
            ok: true,
            message: `${member.name} уже участник встречи «${picked.title}»`,
          }
        await updateMeetingMut.mutateAsync({
          meetingId: picked.id,
          data: {
            title: picked.title,
            description: picked.description ?? undefined,
            startAt: toBackendDateTime(picked.startAt),
            endAt: picked.endAt ? toBackendDateTime(picked.endAt) : undefined,
            link: picked.link ?? undefined,
            participantIds: [
              ...picked.participants.map((p) => p.id),
              member.id,
            ],
          },
        })
        return {
          ok: true,
          message: `${member.name} приглашён(а) на встречу «${picked.title}»`,
        }
      },
    }
  }, [
    ctx,
    queryClient,
    createTask,
    updateStatus,
    updateSprint,
    editTask,
    createSprintMut,
    activateSprintMut,
    finishSprintMut,
    createMeetingMut,
    updateMeetingMut,
  ])
}
