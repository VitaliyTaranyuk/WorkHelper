import { API_ENDPOINT_PATH } from '../endpointPath'
import { workTechApiClient } from '../workTechHttpClient'
import type { RequestParams } from './type'

export type MeetRoomDto = {
  token: string
  title: string
  projectId: string
  projectName?: string | null
  meetingId?: string | null
  taskId?: string | null
  taskCode?: string | null
  createdByName?: string | null
  maxParticipants: number
}

export type CreateMeetRoomRequest = {
  meetingId?: string
  taskId?: string
  title?: string
}

export type IceServer = {
  urls: string[]
  username?: string | null
  credential?: string | null
}

export type IceServersResponse = {
  iceServers: IceServer[]
}

export type MeetStatsRequest = {
  event: 'connected' | 'ice-failed' | 'reconnected' | 'media-denied'
  setupMs?: number
  peers?: number
  detail?: string
}

export function createRoom({
  projectId,
  data,
  otherParams = {},
}: {
  projectId: string
  data: CreateMeetRoomRequest
  otherParams?: RequestParams
}) {
  return workTechApiClient<MeetRoomDto>({
    method: 'POST',
    url: API_ENDPOINT_PATH.MEET.CREATE_ROOM({ projectId }),
    data,
    ...otherParams,
  })
}

export function getRoom({
  token,
  otherParams = {},
}: {
  token: string
  otherParams?: RequestParams
}) {
  return workTechApiClient<MeetRoomDto>({
    method: 'GET',
    url: API_ENDPOINT_PATH.MEET.GET_ROOM({ token }),
    ...otherParams,
  })
}

export function getIceServers({
  otherParams = {},
}: { otherParams?: RequestParams } = {}) {
  return workTechApiClient<IceServersResponse>({
    method: 'GET',
    url: API_ENDPOINT_PATH.MEET.ICE_SERVERS(),
    ...otherParams,
  })
}

export function sendStats({
  token,
  data,
  otherParams = {},
}: {
  token: string
  data: MeetStatsRequest
  otherParams?: RequestParams
}) {
  return workTechApiClient({
    method: 'POST',
    url: API_ENDPOINT_PATH.MEET.STATS({ token }),
    data,
    ...otherParams,
  })
}
