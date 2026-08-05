import type { ApiResponse } from '@/data-contracts'
import { API_ENDPOINT_PATH } from '../endpointPath'
import { workTechApiClient } from '../workTechHttpClient'
import type { RequestParams } from './type'

/**
 * T-515 (ADR-021): этапы процесса задачи.
 *
 * Типы описаны здесь, а не в `data-contracts`: тот файл генерируется из OpenAPI
 * (`npm run openapi-generate`), и правка руками потерялась бы при следующей генерации.
 */
export type ProcessStepDto = {
  id: string
  code: string
  name: string
  description: string | null
  position: number
}

export type ProcessStepRequest = {
  code: string
  name: string
  description?: string
}

export function getProcessSteps({
  projectId,
  otherParams = {},
}: {
  projectId: string
  otherParams?: RequestParams
}) {
  return workTechApiClient<ProcessStepDto[]>({
    method: 'GET',
    url: API_ENDPOINT_PATH.PROCESS_STEPS.LIST({ projectId }),
    ...otherParams,
  })
}

export function createProcessStep({
  projectId,
  data,
  otherParams = {},
}: {
  projectId: string
  data: ProcessStepRequest
  otherParams?: RequestParams
}) {
  return workTechApiClient<ProcessStepDto>({
    method: 'POST',
    url: API_ENDPOINT_PATH.PROCESS_STEPS.CREATE({ projectId }),
    data,
    ...otherParams,
  })
}

export function createDefaultProcessSteps({
  projectId,
  otherParams = {},
}: {
  projectId: string
  otherParams?: RequestParams
}) {
  return workTechApiClient<ProcessStepDto[]>({
    method: 'POST',
    url: API_ENDPOINT_PATH.PROCESS_STEPS.CREATE_DEFAULTS({ projectId }),
    ...otherParams,
  })
}

export function updateProcessStep({
  projectId,
  stepId,
  data,
  otherParams = {},
}: {
  projectId: string
  stepId: string
  data: ProcessStepRequest
  otherParams?: RequestParams
}) {
  return workTechApiClient<ProcessStepDto>({
    method: 'PUT',
    url: API_ENDPOINT_PATH.PROCESS_STEPS.UPDATE({ projectId, stepId }),
    data,
    ...otherParams,
  })
}

export function moveProcessStep({
  projectId,
  stepId,
  up,
  otherParams = {},
}: {
  projectId: string
  stepId: string
  up: boolean
  otherParams?: RequestParams
}) {
  return workTechApiClient<ProcessStepDto[]>({
    method: 'POST',
    url: API_ENDPOINT_PATH.PROCESS_STEPS.MOVE({ projectId, stepId, up }),
    ...otherParams,
  })
}

export function deleteProcessStep({
  projectId,
  stepId,
  otherParams = {},
}: {
  projectId: string
  stepId: string
  otherParams?: RequestParams
}) {
  return workTechApiClient<ApiResponse>({
    method: 'DELETE',
    url: API_ENDPOINT_PATH.PROCESS_STEPS.DELETE({ projectId, stepId }),
    ...otherParams,
  })
}
