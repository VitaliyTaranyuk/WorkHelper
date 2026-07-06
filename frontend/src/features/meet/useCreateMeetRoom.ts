import { useMutation } from '@tanstack/react-query'
import { workTechApi } from '@/shared/api/endpoint'
import type { CreateMeetRoomRequest } from '@/shared/api/endpoint/meetApi'

/** Создание комнаты Meet (идемпотентно для meetingId/taskId — см. backend M1). */
export function useCreateMeetRoom(projectId: string) {
  return useMutation({
    mutationFn: (data: CreateMeetRoomRequest) =>
      workTechApi.meet.createRoom({ projectId, data }).then((r) => r.data),
  })
}
