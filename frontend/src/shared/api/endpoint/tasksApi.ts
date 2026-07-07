import type {
  CreateTaskData,
  UpdateTaskData,
  UpdateTaskStatusData,
  CreateCommentData,
  UpdateCommentData,
  LinkTaskData,
  GetTaskHistoryData,
  GetTasksInProjectData,
  AllTasksLinksData,
  AllTasksCommentsData,
  TaskModelDTO,
  UpdateTaskModelDTO,
  UpdateStatusRequestDTO,
  LinkDto,
  CommentDto,
  UpdateCommentDto,
  DeleteCommentData,
  UpdateTasksSprintRequestDto,
  UpdateTasksSprintData,
  FindTaskByCodeData,
  TaskDataDto,
} from '@/data-contracts'
import { API_ENDPOINT_PATH } from '../endpointPath'
import { workTechApiClient } from '../workTechHttpClient'
import type { RequestParams } from './type'

/**
 * @name ReorderColumn
 * @summary Переупорядочить задачи в колонке (drag-and-drop)
 * @request PUT:/tasks/{projectId}/reorder
 */
export function reorderColumn({
  projectId,
  data,
  otherParams = {},
}: {
  projectId: string
  data: { statusId: number; taskIds: string[] }
  otherParams?: RequestParams
}) {
  return workTechApiClient({
    method: 'PUT',
    url: API_ENDPOINT_PATH.TASKS.REORDER({ projectId }),
    data,
    ...otherParams,
  })
}

/**
 * @name ReorderSprint
 * @summary Перенести задачу в спринт с сохранением позиции (drag-and-drop в списке задач)
 * @request PUT:/tasks/{projectId}/reorder-sprint
 */
export function reorderSprint({
  projectId,
  data,
  otherParams = {},
}: {
  projectId: string
  data: { sprintId: string; taskIds: string[] }
  otherParams?: RequestParams
}) {
  return workTechApiClient({
    method: 'PUT',
    url: API_ENDPOINT_PATH.TASKS.REORDER_SPRINT({ projectId }),
    data,
    ...otherParams,
  })
}

/**
 * @name CreateTask
 * @summary Создать задачу
 * @request POST:/tasks/create
 */
export function createTask({
  data,
  otherParams = {},
}: {
  data: TaskModelDTO
  otherParams?: RequestParams
}) {
  return workTechApiClient<CreateTaskData>({
    method: 'POST',
    url: API_ENDPOINT_PATH.TASKS.CREATE(),
    data,
    ...otherParams,
  })
}

/**
 * @name FindTaskByCode
 * @summary Получение задачи по коду
 * @request GET:/tasks/{projectId}/code/{code}
 */
export function findTaskByCode({
  code,
  projectId,
  otherParams = {},
}: {
  code: string
  projectId: string
  otherParams?: RequestParams
}) {
  return workTechApiClient<FindTaskByCodeData>({
    method: 'GET',
    url: API_ENDPOINT_PATH.TASKS.GET_BY_CODE({ code, projectId }),
    ...otherParams,
  })
}

/**
 * ТП-188: поиск id задач по коду/названию/описанию во всех секциях проекта.
 */
export function searchTasks({
  projectId,
  q,
  otherParams = {},
}: {
  projectId: string
  q: string
  otherParams?: RequestParams
}) {
  return workTechApiClient<string[]>({
    method: 'GET',
    url: API_ENDPOINT_PATH.TASKS.SEARCH({ projectId, q }),
    ...otherParams,
  })
}

/**
 * @name UpdateTask
 * @summary Обновить задачу
 * @request PUT:/tasks/{projectId}/{taskId}/update
 */
export function updateTask({
  projectId,
  taskId,
  data,
  otherParams = {},
}: {
  projectId: string
  taskId: string
  data: UpdateTaskModelDTO
  otherParams?: RequestParams
}) {
  return workTechApiClient<UpdateTaskData>({
    method: 'PUT',
    url: API_ENDPOINT_PATH.TASKS.UPDATE({ projectId, taskId }),
    data,
    ...otherParams,
  })
}

/**
 * @name UpdateTaskStatus
 * @summary Обновить статус задачи
 * @request PUT:/tasks/update-status
 */
export function updateTaskStatus({
  data,
  otherParams = {},
}: {
  data: UpdateStatusRequestDTO
  otherParams?: RequestParams
}) {
  return workTechApiClient<UpdateTaskStatusData>({
    method: 'PUT',
    url: API_ENDPOINT_PATH.TASKS.UPDATE_STATUS(),
    data,
    ...otherParams,
  })
}

/**
 * @name UpdateTasksSprint
 * @summary Обновить спринт задач
 * @request PUT:/tasks/update-sprint
 */
export function updateTasksSprint({
  data,
  otherParams = {},
}: {
  data: UpdateTasksSprintRequestDto
  otherParams?: RequestParams
}) {
  return workTechApiClient<UpdateTasksSprintData>({
    method: 'PUT',
    url: API_ENDPOINT_PATH.TASKS.UPDATE_SPRINT(),
    data,
    ...otherParams,
  })
}

/**
 * @name GetTaskHistory
 * @summary Получить историю изменений задачи
 * @request GET:/tasks/{projectId}/{taskId}/history
 */
export function getTaskHistory({
  projectId,
  taskId,
  otherParams = {},
}: {
  projectId: string
  taskId: string
  otherParams?: RequestParams
}) {
  return workTechApiClient<GetTaskHistoryData>({
    method: 'GET',
    url: API_ENDPOINT_PATH.TASKS.GET_HISTORY({ projectId, taskId }),
    ...otherParams,
  })
}

/**
 * @name GetTasksInProject
 * @summary Получить все задачи активного проекта отсортированные по пользователям
 * @request GET:/tasks/tasks-in-project
 */
export function getTasksInProject({
  otherParams = {},
}: {
  otherParams?: RequestParams
} = {}) {
  return workTechApiClient<GetTasksInProjectData>({
    method: 'GET',
    url: API_ENDPOINT_PATH.TASKS.GET_ALL_IN_PROJECT(),
    ...otherParams,
  })
}

/**
 * @name GetCompletedTasks
 * @summary Завершённые задачи проекта (ушли с активной доски или в колонке Done)
 * @request GET:/tasks/{projectId}/completed
 */
export function getCompletedTasks({
  projectId,
  otherParams = {},
}: {
  projectId: string
  otherParams?: RequestParams
}) {
  return workTechApiClient<TaskDataDto[]>({
    method: 'GET',
    url: API_ENDPOINT_PATH.TASKS.GET_COMPLETED({ projectId }),
    ...otherParams,
  })
}

/** Панель «Разработка» (ТП-21): ветки и PR GitHub, связанные с задачей. */
export type DevInfoDto = {
  available: boolean
  message?: string
  branches: Array<{
    name: string
    url: string
    lastCommitSha?: string
    lastCommitUrl?: string
  }>
  pullRequests: Array<{
    number: number
    title: string
    state: 'open' | 'merged' | 'closed'
    url: string
    branch: string
  }>
}

/**
 * @name GetDevInfo
 * @summary Панель «Разработка»: ветки и PR GitHub, связанные с задачей
 * @request GET:/tasks/{projectId}/{taskId}/dev-info
 */
export function getDevInfo({
  projectId,
  taskId,
  otherParams = {},
}: {
  projectId: string
  taskId: string
  otherParams?: RequestParams
}) {
  return workTechApiClient<DevInfoDto>({
    method: 'GET',
    url: API_ENDPOINT_PATH.TASKS.GET_DEV_INFO({ projectId, taskId }),
    ...otherParams,
  })
}

/**
 * @name LinkTask
 * @summary Связать задачи
 * @request POST:/tasks/create-link
 */
export function linkTask({
  data,
  otherParams = {},
}: {
  data: LinkDto
  otherParams?: RequestParams
}) {
  return workTechApiClient<LinkTaskData>({
    method: 'POST',
    url: API_ENDPOINT_PATH.TASKS.LINK(),
    data,
    ...otherParams,
  })
}

/**
 * @name DeleteLink
 * @summary Удалить связь между задачами
 * @request DELETE:/tasks/{projectId}/links/{linkId}
 */
export function deleteLink({
  projectId,
  linkId,
  otherParams = {},
}: {
  projectId: string
  linkId: string
  otherParams?: RequestParams
}) {
  return workTechApiClient({
    method: 'DELETE',
    url: API_ENDPOINT_PATH.TASKS.DELETE_LINK({ projectId, linkId }),
    ...otherParams,
  })
}

/**
 * @name AllTasksLinks
 * @summary Вывод всех связей задачи
 * @request GET:/tasks/{taskId}/{projectId}/links
 */
export function getAllTasksLinks({
  taskId,
  projectId,
  otherParams = {},
}: {
  taskId: string
  projectId: string
  otherParams?: RequestParams
}) {
  return workTechApiClient<AllTasksLinksData>({
    method: 'GET',
    url: API_ENDPOINT_PATH.TASKS.GET_LINKS({ taskId, projectId }),
    ...otherParams,
  })
}

/**
 * @name CreateComment
 * @summary Создать комментарий к задаче
 * @request POST:/tasks/create-comment
 */
export function createComment({
  data,
  otherParams = {},
}: {
  data: CommentDto
  otherParams?: RequestParams
}) {
  return workTechApiClient<CreateCommentData>({
    method: 'POST',
    url: API_ENDPOINT_PATH.TASKS.CREATE_COMMENT(),
    data,
    ...otherParams,
  })
}

/**
 * @name UpdateComment
 * @summary Обновить комментарий
 * @request PUT:/tasks/update-comment
 */
export function updateComment({
  data,
  otherParams = {},
}: {
  data: UpdateCommentDto
  otherParams?: RequestParams
}) {
  return workTechApiClient<UpdateCommentData>({
    method: 'PUT',
    url: API_ENDPOINT_PATH.TASKS.UPDATE_COMMENT(),
    data,
    ...otherParams,
  })
}

/**
 * @name DeleteComment
 * @summary Удалить комментарий
 * @request DELETE:/tasks/{commentId}/{taskId}/{projectId}/delete-comment
 */
export function deleteComment({
  commentId,
  taskId,
  projectId,
  otherParams = {},
}: {
  commentId: string
  taskId: string
  projectId: string
  otherParams?: RequestParams
}) {
  return workTechApiClient<DeleteCommentData>({
    method: 'DELETE',
    url: API_ENDPOINT_PATH.TASKS.DELETE_COMMENT({
      commentId,
      taskId,
      projectId,
    }),
    ...otherParams,
  })
}

export function deleteTask({
  projectId,
  taskId,
  otherParams = {},
}: {
  projectId: string
  taskId: string
  otherParams?: RequestParams
}) {
  return workTechApiClient({
    method: 'DELETE',
    url: API_ENDPOINT_PATH.TASKS.DELETE({ projectId, taskId }),
    ...otherParams,
  })
}

/**
 * @name GetAllTasksComments
 * @summary Получить комментарии к задаче
 * @request GET:/tasks/{taskId}/{projectId}/comments
 */
export function getComments({
  taskId,
  projectId,
  otherParams = {},
}: {
  taskId: string
  projectId: string
  otherParams?: RequestParams
}) {
  return workTechApiClient<AllTasksCommentsData>({
    method: 'GET',
    url: API_ENDPOINT_PATH.TASKS.GET_COMMENTS({ taskId, projectId }),
    ...otherParams,
  })
}
