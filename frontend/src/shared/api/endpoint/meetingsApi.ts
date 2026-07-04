import { API_ENDPOINT_PATH } from '../endpointPath'
import { workTechApiClient } from '../workTechHttpClient'
import type { RequestParams } from './type'

export type MeetingParticipant = {
  id: string
  displayName: string
  username?: string | null
}

export type MeetingDto = {
  id: string
  title: string
  description?: string | null
  startAt: string
  endAt?: string | null
  link?: string | null
  creatorName?: string | null
  participants: MeetingParticipant[]
}

export type CreateMeetingRequest = {
  title: string
  description?: string
  startAt: string
  endAt?: string
  link?: string
  participantIds?: string[]
}

export function getMeetings({
  projectId,
  otherParams = {},
}: {
  projectId: string
  otherParams?: RequestParams
}) {
  return workTechApiClient<MeetingDto[]>({
    method: 'GET',
    url: API_ENDPOINT_PATH.MEETINGS.LIST({ projectId }),
    ...otherParams,
  })
}

export function createMeeting({
  projectId,
  data,
  otherParams = {},
}: {
  projectId: string
  data: CreateMeetingRequest
  otherParams?: RequestParams
}) {
  return workTechApiClient<MeetingDto>({
    method: 'POST',
    url: API_ENDPOINT_PATH.MEETINGS.CREATE({ projectId }),
    data,
    ...otherParams,
  })
}

export function updateMeeting({
  meetingId,
  data,
  otherParams = {},
}: {
  meetingId: string
  data: CreateMeetingRequest
  otherParams?: RequestParams
}) {
  return workTechApiClient<MeetingDto>({
    method: 'PUT',
    url: API_ENDPOINT_PATH.MEETINGS.UPDATE({ meetingId }),
    data,
    ...otherParams,
  })
}

export function deleteMeeting({
  meetingId,
  otherParams = {},
}: {
  meetingId: string
  otherParams?: RequestParams
}) {
  return workTechApiClient({
    method: 'DELETE',
    url: API_ENDPOINT_PATH.MEETINGS.DELETE({ meetingId }),
    ...otherParams,
  })
}
