type ProjectId = {
  projectId: string | number
}

type TaskId = {
  taskId: string | number
}

type SprintId = {
  sprintId: string | number
}

type CommentId = {
  commentId: string | number
}

type UserId = {
  userId: string | number
}

export const API_ENDPOINT_PATH = {
  AUTH: {
    LOGIN: () => `/auth/login`,
    REFRESH_TOKEN: () => `/auth/refresh`,
    LOGOUT: () => `/auth/logout`,
    CONFIRM_EMAIL: () => `/auth/confirm-email`,
  },

  REGISTRATION: {
    REGISTER: () => `/registration/registry`,
  },

  USERS: {
    GET_ALL: () => `/users`,
    PROFILE: () => `/users/profile`,
    UPDATE: () => `/users/update`,
    GENDER_VALUES: () => `/users/gender-values`,
  },

  PROJECTS: {
    CREATE: () => `/projects/create`,

    GET_ALL_USER: () => `/projects/for-user`,

    GET_ACTIVE: () => `/projects/last`,

    GET_BY_ID: ({ projectId }: ProjectId) => `/projects/${projectId}`,

    GET_FILTERED: ({ projectId }: ProjectId) =>
      `/projects/${projectId}/filtered`,

    START: ({ projectId }: ProjectId) => `/projects/${projectId}/start`,

    FINISH: ({ projectId }: ProjectId) => `/projects/${projectId}/finish`,

    UPDATE_PROJECT: ({ projectId }: ProjectId) => `/projects/${projectId}/edit`,

    ARCHIVE: ({ projectId }: ProjectId) => `/projects/${projectId}/archive`,

    DELETE: ({ projectId }: ProjectId) => `/projects/${projectId}`,

    HISTORY: ({ projectId }: ProjectId) => `/projects/${projectId}/history`,

    ADD_USERS: ({ projectId }: ProjectId) => `/projects/${projectId}/add-users`,

    REMOVE_USERS: ({ projectId }: ProjectId) =>
      `/projects/${projectId}/delete-users`,
  },

  SPRINTS: {
    CREATE: ({ projectId }: ProjectId) =>
      `/sprints/project/${projectId}/create`,

    UPDATE: ({ projectId, sprintId }: ProjectId & SprintId) =>
      `/sprints/project/${projectId}/${sprintId}/update`,

    ACTIVATE: ({ projectId, sprintId }: ProjectId & SprintId) =>
      `/sprints/project/${projectId}/${sprintId}/activate`,

    PAUSE: ({ projectId, sprintId }: ProjectId & SprintId) =>
      `/sprints/project/${projectId}/${sprintId}/pause`,

    RESUME: ({ projectId, sprintId }: ProjectId & SprintId) =>
      `/sprints/project/${projectId}/${sprintId}/resume`,

    FINISH: ({ projectId, sprintId }: ProjectId & SprintId) =>
      `/sprints/project/${projectId}/${sprintId}/finish`,

    DELETE: ({ projectId, sprintId }: ProjectId & SprintId) =>
      `/sprints/project/${projectId}/${sprintId}`,

    GET_INFO: ({ projectId }: ProjectId) =>
      `/sprints/project/${projectId}/sprint-info`,

    GET_ALL_INFO: ({ projectId }: ProjectId) =>
      `/sprints/project/${projectId}/info`,

    GET_ALL: ({ projectId }: ProjectId) =>
      `/sprints/project/${projectId}/sprint-list`,
  },

  TASKS: {
    CREATE: () => `/tasks/create`,

    UPDATE: ({ projectId, taskId }: ProjectId & TaskId) =>
      `/tasks/${projectId}/${taskId}/update`,

    UPDATE_STATUS: () => `/tasks/update-status`,

    DELETE: ({ projectId, taskId }: ProjectId & TaskId) =>
      `/tasks/${projectId}/${taskId}`,

    REORDER: ({ projectId }: ProjectId) => `/tasks/${projectId}/reorder`,

    UPDATE_SPRINT: () => `/tasks/update-sprint`,

    GET_HISTORY: ({ projectId, taskId }: ProjectId & TaskId) =>
      `/tasks/${projectId}/${taskId}/history`,

    GET_ALL_IN_PROJECT: () => `/tasks/tasks-in-project`,

    GET_COMPLETED: ({ projectId }: ProjectId) =>
      `/tasks/${projectId}/completed`,

    GET_BY_CODE: ({ code, projectId }: { code: string } & ProjectId) =>
      `/tasks/${projectId}/code/${code}`,

    LINK: () => `/tasks/create-link`,

    GET_LINKS: ({ taskId, projectId }: TaskId & ProjectId) =>
      `/tasks/${taskId}/${projectId}/links`,

    DELETE_LINK: ({ projectId, linkId }: ProjectId & { linkId: string }) =>
      `/tasks/${projectId}/links/${linkId}`,

    CREATE_COMMENT: () => `/tasks/create-comment`,

    UPDATE_COMMENT: () => `/tasks/update-comment`,

    DELETE_COMMENT: ({
      projectId,
      taskId,
      commentId,
    }: ProjectId & TaskId & CommentId) =>
      `/tasks/${commentId}/${taskId}/${projectId}/delete-comment`,

    GET_COMMENTS: ({ projectId, taskId }: ProjectId & TaskId) =>
      `/tasks/${taskId}/${projectId}/comments`,
  },

  STATUSES: {
    GET_ALL: ({ projectId }: ProjectId) => `/statuses/project/${projectId}`,

    CREATE: ({ projectId }: ProjectId) =>
      `/statuses/project/${projectId}/create`,

    UPDATE: ({ projectId }: ProjectId) =>
      `/statuses/project/${projectId}/update`,

    DELETE: ({ projectId, statusId }: ProjectId & { statusId: number }) =>
      `/statuses/project/${projectId}/${statusId}`,
  },

  ADMIN: {
    BLOCK_USERS: () => `/admin/block`,

    ACTIVATE_USERS: () => `/admin/activate`,

    UPDATE_ROLES: ({ userId }: UserId) => `/admin/${userId}/update-roles`,

    UPDATE_OWNER: ({ projectId, userId }: ProjectId & UserId) =>
      `/admin/${projectId}/${userId}/update-owner`,

    ADD_PERMISSION: ({ projectId, userId }: ProjectId & UserId) =>
      `/admin/${projectId}/${userId}/add-extended-permission`,

    REMOVE_PERMISSION: ({ projectId, userId }: ProjectId & UserId) =>
      `/admin/${projectId}/${userId}/delete-extended-permission`,

    GET_USER: ({ userId }: UserId) => `/admin/${userId}/profile`,
  },

  ROLES: {
    GET_ALL: () => `/roles`,
  },

  MEETINGS: {
    LIST: ({ projectId }: ProjectId) => `/meetings/project/${projectId}`,
    CREATE: ({ projectId }: ProjectId) => `/meetings/project/${projectId}`,
    UPDATE: ({ meetingId }: { meetingId: string }) => `/meetings/${meetingId}`,
    DELETE: ({ meetingId }: { meetingId: string }) => `/meetings/${meetingId}`,
  },

  NOTIFICATIONS: {
    LIST: () => `/notifications`,
    UNREAD_COUNT: () => `/notifications/unread-count`,
    MARK_READ: ({ id }: { id: string }) => `/notifications/${id}/read`,
    MARK_ALL_READ: () => `/notifications/read-all`,
  },
} as const
