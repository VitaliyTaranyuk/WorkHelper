import { workTechApi } from '@/shared/api/endpoint'
import type { CreateMeetingRequest } from '@/shared/api/endpoint/meetingsApi'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

export function useMeetings(projectId: string | undefined) {
  return useQuery({
    queryKey: ['meetings', projectId],
    queryFn: () =>
      workTechApi.meeting.getMeetings({ projectId: projectId! }).then((r) => r.data),
    enabled: !!projectId,
  })
}

export function useCreateMeeting(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateMeetingRequest) =>
      workTechApi.meeting.createMeeting({ projectId, data }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['meetings', projectId] }),
  })
}

export function useDeleteMeeting(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (meetingId: string) =>
      workTechApi.meeting.deleteMeeting({ meetingId }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['meetings', projectId] }),
  })
}
