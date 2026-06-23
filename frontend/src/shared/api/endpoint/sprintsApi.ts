import type {
  FinishSprintData,
  GetSprintInfoData,
  SprintDtoRequest,
  UpdateSprintData,
  ActivateSprintData,
  CreateSprintData,
  GetSprintInfoListData,
  GetSprintListData,
} from '@/data-contracts'
import { API_ENDPOINT_PATH } from '../endpointPath'
import { workTechApiClient } from '../workTechHttpClient'
import type { RequestParams } from './type'

/**
 * @name CreateSprint
 * @summary Создать спринт в проекте
 * @request POST:/sprints/project/{projectId}/create
 */
export function createSprint({
  projectId,
  data,
  otherParams = {},
}: {
  projectId: string
  data: SprintDtoRequest
  otherParams?: RequestParams
}) {
  return workTechApiClient<CreateSprintData>({
    method: 'POST',
    url: API_ENDPOINT_PATH.SPRINTS.CREATE({ projectId }),
    data,
    ...otherParams,
  })
}

/**
 * @name UpdateSprint
 * @summary Обновить спринт
 * @request PUT:/sprints/project/{projectId}/{sprintId}/update
 */
export function updateSprint({
  projectId,
  sprintId,
  data,
  otherParams = {},
}: {
  projectId: string
  sprintId: string
  data: SprintDtoRequest
  otherParams?: RequestParams
}) {
  return workTechApiClient<UpdateSprintData>({
    method: 'PUT',
    url: API_ENDPOINT_PATH.SPRINTS.UPDATE({ projectId, sprintId }),
    data,
    ...otherParams,
  })
}

/**
 * @name ActivateSprint
 * @summary Активировать спринт
 * @request PUT:/sprints/project/{projectId}/{sprintId}/activate
 */
export function activateSprint({
  projectId,
  sprintId,
  otherParams = {},
}: {
  projectId: string
  sprintId: string
  otherParams?: RequestParams
}) {
  return workTechApiClient<ActivateSprintData>({
    method: 'PUT',
    url: API_ENDPOINT_PATH.SPRINTS.ACTIVATE({ projectId, sprintId }),
    ...otherParams,
  })
}

/**
 * @name PauseSprint
 * @summary Приостановить спринт
 * @request PUT:/sprints/project/{projectId}/{sprintId}/pause
 */
export function pauseSprint({
  projectId,
  sprintId,
  otherParams = {},
}: {
  projectId: string
  sprintId: string
  otherParams?: RequestParams
}) {
  return workTechApiClient<ActivateSprintData>({
    method: 'PUT',
    url: API_ENDPOINT_PATH.SPRINTS.PAUSE({ projectId, sprintId }),
    ...otherParams,
  })
}

/**
 * @name ResumeSprint
 * @summary Возобновить спринт
 * @request PUT:/sprints/project/{projectId}/{sprintId}/resume
 */
export function resumeSprint({
  projectId,
  sprintId,
  otherParams = {},
}: {
  projectId: string
  sprintId: string
  otherParams?: RequestParams
}) {
  return workTechApiClient<ActivateSprintData>({
    method: 'PUT',
    url: API_ENDPOINT_PATH.SPRINTS.RESUME({ projectId, sprintId }),
    ...otherParams,
  })
}

/**
 * @name FinishSprint
 * @summary Завершить спринт
 * @request PUT:/sprints/project/{projectId}/{sprintId}/finish
 */
export function finishSprint({
  projectId,
  sprintId,
  otherParams = {},
}: {
  projectId: string
  sprintId: string
  otherParams?: RequestParams
}) {
  return workTechApiClient<FinishSprintData>({
    method: 'PUT',
    url: API_ENDPOINT_PATH.SPRINTS.FINISH({ projectId, sprintId }),
    ...otherParams,
  })
}

export function deleteSprint({
  projectId,
  sprintId,
  otherParams = {},
}: {
  projectId: string
  sprintId: string
  otherParams?: RequestParams
}) {
  return workTechApiClient({
    method: 'DELETE',
    url: API_ENDPOINT_PATH.SPRINTS.DELETE({ projectId, sprintId }),
    ...otherParams,
  })
}

/**
 * @name GetSprintInfo
 * @summary Получить информацию по спринту (текущему/активному)
 * @request GET:/sprints/project/{projectId}/sprint-info
 */
export function getSprintInfo({
  projectId,
  otherParams = {},
}: {
  projectId: string
  otherParams?: RequestParams
}) {
  return workTechApiClient<GetSprintInfoData>({
    method: 'GET',
    url: API_ENDPOINT_PATH.SPRINTS.GET_INFO({ projectId }),
    ...otherParams,
  })
}

/**
 * @name GetSprintList
 * @summary Получить список спринтов
 * @request GET:/sprints/project/{projectId}/sprint-list
 * @response `200` `GetSprintListData` OK
 * @response `403` `ErrorResponse` Forbidden
 */
export function getALLSprints({
  projectId,
  otherParams = {},
}: {
  projectId: string
  otherParams?: RequestParams
}) {
  return workTechApiClient<GetSprintListData>({
    method: 'GET',
    url: API_ENDPOINT_PATH.SPRINTS.GET_ALL({ projectId }),
    ...otherParams,
  })
}

/**
 * @name GetSprintInfoList
 * @summary Получить список спринтов без задач
 * @request GET:/sprints/project/{projectId}/info
 * @response `200` `GetSprintInfoListData` OK
 * @response `403` `ErrorResponse` Forbidden
 */
export function getALLSprintsInfo({
  projectId,
  otherParams = {},
}: {
  projectId: string
  otherParams?: RequestParams
}) {
  return workTechApiClient<GetSprintInfoListData>({
    method: 'GET',
    url: API_ENDPOINT_PATH.SPRINTS.GET_ALL_INFO({ projectId }),
    ...otherParams,
  })
}
