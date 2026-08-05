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

type RuleSetId = {
  ruleSetId: string
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
    SETTINGS: () => `/users/settings`,
  },

  // T-510: привязка проекта к репозиторию. Проект в пути — как во всех
  // проектных запросах после T-518.
  REPO_BINDINGS: {
    LIST: ({ projectId }: ProjectId) => `/repo-bindings/project/${projectId}`,

    CREATE: ({ projectId }: ProjectId) => `/repo-bindings/project/${projectId}`,

    UPDATE: ({ projectId, bindingId }: ProjectId & { bindingId: string }) =>
      `/repo-bindings/project/${projectId}/${bindingId}`,

    DELETE: ({ projectId, bindingId }: ProjectId & { bindingId: string }) =>
      `/repo-bindings/project/${projectId}/${bindingId}`,
  },

  // T-511: наборы правил. Общие наборы пользователя и наборы проекта — один
  // ресурс с разным входом (ADR-018): уровень набора определяется тем, есть ли
  // у него проект, а не отдельной сущностью.
  RULE_SETS: {
    LIST_MY: () => `/rule-sets/my`,
    CREATE_MY: () => `/rule-sets/my`,

    LIST_FOR_PROJECT: ({ projectId }: ProjectId) =>
      `/rule-sets/project/${projectId}`,
    CREATE_FOR_PROJECT: ({ projectId }: ProjectId) =>
      `/rule-sets/project/${projectId}`,

    UPDATE: ({ ruleSetId }: RuleSetId) => `/rule-sets/${ruleSetId}`,
    DELETE: ({ ruleSetId }: RuleSetId) => `/rule-sets/${ruleSetId}`,

    // T-513: эталонные наборы WorkHelper. Каталог порождён из
    // `.ai/PROJECT_RULES.md`, импорт создаёт обычный набор.
    REFERENCE: () => `/rule-sets/reference`,
    IMPORT_REFERENCE_MY: ({ referenceId }: { referenceId: string }) =>
      `/rule-sets/reference/${referenceId}/my`,
    IMPORT_REFERENCE_PROJECT: ({
      referenceId,
      projectId,
    }: { referenceId: string } & ProjectId) =>
      `/rule-sets/reference/${referenceId}/project/${projectId}`,

    // T-514: выгрузка правил проекта в AGENTS.md (ADR-023).
    EXPORT_AGENTS_MD: ({ projectId }: ProjectId) =>
      `/rule-sets/project/${projectId}/agents-md`,

    LIST_RULES: ({ ruleSetId }: RuleSetId) => `/rule-sets/${ruleSetId}/rules`,
    ADD_RULE: ({ ruleSetId }: RuleSetId) => `/rule-sets/${ruleSetId}/rules`,
    UPDATE_RULE: ({ ruleSetId, ruleId }: RuleSetId & { ruleId: string }) =>
      `/rule-sets/${ruleSetId}/rules/${ruleId}`,
    DELETE_RULE: ({ ruleSetId, ruleId }: RuleSetId & { ruleId: string }) =>
      `/rule-sets/${ruleSetId}/rules/${ruleId}`,
  },

  // T-515: этапы процесса задачи принадлежат проекту (ADR-021).
  PROCESS_STEPS: {
    LIST: ({ projectId }: ProjectId) => `/process-steps/project/${projectId}`,
    CREATE: ({ projectId }: ProjectId) => `/process-steps/project/${projectId}`,
    CREATE_DEFAULTS: ({ projectId }: ProjectId) =>
      `/process-steps/project/${projectId}/defaults`,
    UPDATE: ({ projectId, stepId }: ProjectId & { stepId: string }) =>
      `/process-steps/project/${projectId}/${stepId}`,
    MOVE: ({ projectId, stepId, up }: ProjectId & { stepId: string; up: boolean }) =>
      `/process-steps/project/${projectId}/${stepId}/move?up=${up}`,
    DELETE: ({ projectId, stepId }: ProjectId & { stepId: string }) =>
      `/process-steps/project/${projectId}/${stepId}`,
  },

  PROJECTS: {
    CREATE: () => `/projects/create`,

    GET_ALL_USER: () => `/projects/for-user`,

    GET_ACTIVE: () => `/projects/last`,

    // T-518: явное «работаю в этом проекте» вместо побочного эффекта GET.
    REMEMBER_LAST: ({ projectId }: ProjectId) => `/projects/${projectId}/last`,

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

    CREATE_INVITE: ({ projectId }: ProjectId) =>
      `/projects/${projectId}/invites`,

    ACCEPT_INVITE: ({ token }: { token: string }) =>
      `/projects/invites/${token}/accept`,

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

    // ТП-240: фоновая замена автоматического названия улучшенным
    AUTO_TITLE: ({ projectId, taskId }: ProjectId & TaskId) =>
      `/tasks/${projectId}/${taskId}/auto-title`,

    // ТП-241: фоновая замена надиктованного описания вычищенным
    AUTO_DESCRIPTION: ({ projectId, taskId }: ProjectId & TaskId) =>
      `/tasks/${projectId}/${taskId}/auto-description`,

    DELETE: ({ projectId, taskId }: ProjectId & TaskId) =>
      `/tasks/${projectId}/${taskId}`,

    REORDER: ({ projectId }: ProjectId) => `/tasks/${projectId}/reorder`,

    REORDER_SPRINT: ({ projectId }: ProjectId) =>
      `/tasks/${projectId}/reorder-sprint`,

    UPDATE_SPRINT: () => `/tasks/update-sprint`,

    // T-309: массовые операции. В UI выведены только обратимые — архивация,
    // перенос в спринт, смена статуса. `/bulk/delete` и `/bulk/move-project`
    // намеренно не подключены: удаление необратимо, а перенос между проектами
    // ПЕРЕВЫДАЁТ код задачи (TaskService.bulkMoveProject), то есть ломает
    // старые ссылки и упоминания безвозвратно.
    BULK_ARCHIVE: () => `/tasks/bulk/archive`,

    BULK_MOVE_STATUS: () => `/tasks/bulk/move-status`,

    BULK_MOVE_SPRINT: () => `/tasks/bulk/move-sprint`,

    GET_HISTORY: ({ projectId, taskId }: ProjectId & TaskId) =>
      `/tasks/${projectId}/${taskId}/history`,

    // T-518: было `/tasks/tasks-in-project` без проекта — «активный проект»
    // брался на сервере из last_project_id, из-за чего доска не открывалась
    // по ссылке и зависела от соседней вкладки.
    GET_BOARD: ({ projectId }: ProjectId) => `/tasks/${projectId}/board`,

    GET_COMPLETED: ({ projectId }: ProjectId) =>
      `/tasks/${projectId}/completed`,

    // T-151: эндпоинты архивации существовали с 2026-07, но в интерфейс не
    // были выведены ни одной кнопкой — недоступная функциональность (K-32).
    ARCHIVE_TASK: ({ projectId, taskId }: ProjectId & TaskId) =>
      `/tasks/${projectId}/${taskId}/archive`,

    RESTORE_TASK: ({ projectId, taskId }: ProjectId & TaskId) =>
      `/tasks/${projectId}/${taskId}/restore`,

    GET_DEV_INFO: ({ projectId, taskId }: ProjectId & TaskId) =>
      `/tasks/${projectId}/${taskId}/dev-info`,

    GET_BY_CODE: ({ code, projectId }: { code: string } & ProjectId) =>
      `/tasks/${projectId}/code/${code}`,

    // ТП-188: поиск id задач по коду/названию/описанию (все спринты+бэклог+завершённые)
    SEARCH: ({ projectId, q }: ProjectId & { q: string }) =>
      `/tasks/${projectId}/search?q=${encodeURIComponent(q)}`,

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

  MEET: {
    CREATE_ROOM: ({ projectId }: ProjectId) => `/meet/rooms/project/${projectId}`,
    GET_ROOM: ({ token }: { token: string }) => `/meet/rooms/${token}`,
    ICE_SERVERS: () => `/meet/ice-servers`,
    STATS: ({ token }: { token: string }) => `/meet/rooms/${token}/stats`,
  },

  VOICE: {
    // ТП-208: улучшение текста голосового ввода/названия задачи через DeepSeek.
    ENHANCE_TEXT: () => `/voice/enhance-text`,
  },
} as const
