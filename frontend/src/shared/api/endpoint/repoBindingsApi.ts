import type { ApiResponse } from '@/data-contracts'
import { API_ENDPOINT_PATH } from '../endpointPath'
import { workTechApiClient } from '../workTechHttpClient'
import type { RequestParams } from './type'

/**
 * T-510: привязка проекта к репозиторию.
 *
 * Типы описаны здесь, а не в `data-contracts`: тот файл генерируется из OpenAPI
 * (`npm run openapi-generate`), и дописывать его руками значило бы потерять
 * правку при следующей генерации.
 */
export type RepoBindingDto = {
  id: string
  provider: string
  url: string
  defaultBranch: string
  createdAt: string
}

export type RepoBindingRequest = {
  provider: string
  url: string
  defaultBranch: string
}

export function getRepoBindings({
  projectId,
  otherParams = {},
}: {
  projectId: string
  otherParams?: RequestParams
}) {
  return workTechApiClient<RepoBindingDto[]>({
    method: 'GET',
    url: API_ENDPOINT_PATH.REPO_BINDINGS.LIST({ projectId }),
    ...otherParams,
  })
}

export function createRepoBinding({
  projectId,
  data,
  otherParams = {},
}: {
  projectId: string
  data: RepoBindingRequest
  otherParams?: RequestParams
}) {
  return workTechApiClient<RepoBindingDto>({
    method: 'POST',
    url: API_ENDPOINT_PATH.REPO_BINDINGS.CREATE({ projectId }),
    data,
    ...otherParams,
  })
}

export function updateRepoBinding({
  projectId,
  bindingId,
  data,
  otherParams = {},
}: {
  projectId: string
  bindingId: string
  data: RepoBindingRequest
  otherParams?: RequestParams
}) {
  return workTechApiClient<RepoBindingDto>({
    method: 'PUT',
    url: API_ENDPOINT_PATH.REPO_BINDINGS.UPDATE({ projectId, bindingId }),
    data,
    ...otherParams,
  })
}

export function deleteRepoBinding({
  projectId,
  bindingId,
  otherParams = {},
}: {
  projectId: string
  bindingId: string
  otherParams?: RequestParams
}) {
  return workTechApiClient<ApiResponse>({
    method: 'DELETE',
    url: API_ENDPOINT_PATH.REPO_BINDINGS.DELETE({ projectId, bindingId }),
    ...otherParams,
  })
}
