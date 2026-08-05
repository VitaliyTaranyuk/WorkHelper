import { API_ENDPOINT_PATH } from '../endpointPath'
import { workTechApiClient } from '../workTechHttpClient'
import type { RequestParams } from './type'

/**
 * T-516: размер задачи и её этап процесса.
 *
 * Обязательность этапа приходит с сервера полем `required`, а не вычисляется здесь:
 * правило «этап обязателен с размера X» принадлежит проекту, и второе его вычисление на
 * клиенте неизбежно разошлось бы с серверным.
 */
export type TaskProcessStepDto = {
  id: string
  code: string
  name: string
  description: string | null
  position: number
  requiredFromSize: string | null
  required: boolean
  current: boolean
}

export type TaskProcessDto = {
  taskId: string
  size: string | null
  currentStepId: string | null
  steps: TaskProcessStepDto[]
}

export function getTaskProcess({
  projectId,
  taskId,
  otherParams = {},
}: {
  projectId: string
  taskId: string
  otherParams?: RequestParams
}) {
  return workTechApiClient<TaskProcessDto>({
    method: 'GET',
    url: API_ENDPOINT_PATH.TASK_PROCESS.GET({ projectId, taskId }),
    ...otherParams,
  })
}

export function setTaskSize({
  projectId,
  taskId,
  size,
  otherParams = {},
}: {
  projectId: string
  taskId: string
  /** `null` — снять размер. */
  size: string | null
  otherParams?: RequestParams
}) {
  return workTechApiClient<TaskProcessDto>({
    method: 'PUT',
    url: API_ENDPOINT_PATH.TASK_PROCESS.SET_SIZE({ projectId, taskId }),
    data: { size },
    ...otherParams,
  })
}

export function setTaskProcessStep({
  projectId,
  taskId,
  stepId,
  otherParams = {},
}: {
  projectId: string
  taskId: string
  /** `null` — снять этап. */
  stepId: string | null
  otherParams?: RequestParams
}) {
  return workTechApiClient<TaskProcessDto>({
    method: 'PUT',
    url: API_ENDPOINT_PATH.TASK_PROCESS.SET_STEP({ projectId, taskId }),
    data: { stepId },
    ...otherParams,
  })
}
