import type { ApiResponse } from '@/data-contracts'
import { API_ENDPOINT_PATH } from '../endpointPath'
import { workTechApiClient } from '../workTechHttpClient'
import type { RequestParams } from './type'

/**
 * T-511: правила как данные.
 *
 * Типы описаны здесь, а не в `data-contracts`: тот файл генерируется из OpenAPI
 * (`npm run openapi-generate`), и дописывать его руками значило бы потерять
 * правку при следующей генерации.
 *
 * Перечисления объявлены как `string`, а не как union литералов: сервер вправе
 * добавить значение, и фронтенд обязан деградировать к показу самого значения,
 * а не падать (**W-08** — маппер, бросавший на новом типе задачи, обнулил
 * когда-то целый экран).
 */
export type RuleSetDto = {
  id: string
  /** `null` — общий набор пользователя, иначе набор проекта. */
  projectId: string | null
  name: string
  description: string | null
  version: number
  rulesCount: number
  createdAt: string
}

export type RuleSetRequest = {
  name: string
  description?: string
}

export type RuleDto = {
  id: string
  code: string
  level: string
  kind: string
  strength: string
  triggerCondition: string
  verification: string
  body: string
  sourceRuleId: string | null
  systemRule: boolean
}

export type RuleRequest = {
  code: string
  level: string
  kind: string
  strength: string
  triggerCondition: string
  verification: string
  body: string
}

export function getMyRuleSets({
  otherParams = {},
}: { otherParams?: RequestParams } = {}) {
  return workTechApiClient<RuleSetDto[]>({
    method: 'GET',
    url: API_ENDPOINT_PATH.RULE_SETS.LIST_MY(),
    ...otherParams,
  })
}

export function getProjectRuleSets({
  projectId,
  otherParams = {},
}: {
  projectId: string
  otherParams?: RequestParams
}) {
  return workTechApiClient<RuleSetDto[]>({
    method: 'GET',
    url: API_ENDPOINT_PATH.RULE_SETS.LIST_FOR_PROJECT({ projectId }),
    ...otherParams,
  })
}

export function createMyRuleSet({
  data,
  otherParams = {},
}: {
  data: RuleSetRequest
  otherParams?: RequestParams
}) {
  return workTechApiClient<RuleSetDto>({
    method: 'POST',
    url: API_ENDPOINT_PATH.RULE_SETS.CREATE_MY(),
    data,
    ...otherParams,
  })
}

export function createProjectRuleSet({
  projectId,
  data,
  otherParams = {},
}: {
  projectId: string
  data: RuleSetRequest
  otherParams?: RequestParams
}) {
  return workTechApiClient<RuleSetDto>({
    method: 'POST',
    url: API_ENDPOINT_PATH.RULE_SETS.CREATE_FOR_PROJECT({ projectId }),
    data,
    ...otherParams,
  })
}

export function updateRuleSet({
  ruleSetId,
  data,
  otherParams = {},
}: {
  ruleSetId: string
  data: RuleSetRequest
  otherParams?: RequestParams
}) {
  return workTechApiClient<RuleSetDto>({
    method: 'PUT',
    url: API_ENDPOINT_PATH.RULE_SETS.UPDATE({ ruleSetId }),
    data,
    ...otherParams,
  })
}

export function deleteRuleSet({
  ruleSetId,
  otherParams = {},
}: {
  ruleSetId: string
  otherParams?: RequestParams
}) {
  return workTechApiClient<ApiResponse>({
    method: 'DELETE',
    url: API_ENDPOINT_PATH.RULE_SETS.DELETE({ ruleSetId }),
    ...otherParams,
  })
}

/** T-513: эталонный набор правил WorkHelper, доступный для импорта. */
export type ReferenceSetDto = {
  id: string
  name: string
  description: string
  rulesCount: number
}

export function getReferenceSets({
  otherParams = {},
}: { otherParams?: RequestParams } = {}) {
  return workTechApiClient<ReferenceSetDto[]>({
    method: 'GET',
    url: API_ENDPOINT_PATH.RULE_SETS.REFERENCE(),
    ...otherParams,
  })
}

export function importReferenceIntoMy({
  referenceId,
  otherParams = {},
}: {
  referenceId: string
  otherParams?: RequestParams
}) {
  return workTechApiClient<RuleSetDto>({
    method: 'POST',
    url: API_ENDPOINT_PATH.RULE_SETS.IMPORT_REFERENCE_MY({ referenceId }),
    ...otherParams,
  })
}

export function importReferenceIntoProject({
  referenceId,
  projectId,
  otherParams = {},
}: {
  referenceId: string
  projectId: string
  otherParams?: RequestParams
}) {
  return workTechApiClient<RuleSetDto>({
    method: 'POST',
    url: API_ENDPOINT_PATH.RULE_SETS.IMPORT_REFERENCE_PROJECT({
      referenceId,
      projectId,
    }),
    ...otherParams,
  })
}

/**
 * T-514: сгенерированный `AGENTS.md`. Отдаётся содержимым, а не файлом — из строки
 * доступны и предпросмотр, и копирование, и скачивание, из потока байт только последнее.
 */
export type AgentsFileDto = {
  fileName: string
  content: string
  rulesCount: number
  generatedAt: string
}

export function exportAgentsMd({
  projectId,
  otherParams = {},
}: {
  projectId: string
  otherParams?: RequestParams
}) {
  return workTechApiClient<AgentsFileDto>({
    method: 'GET',
    url: API_ENDPOINT_PATH.RULE_SETS.EXPORT_AGENTS_MD({ projectId }),
    ...otherParams,
  })
}

export function getRules({
  ruleSetId,
  otherParams = {},
}: {
  ruleSetId: string
  otherParams?: RequestParams
}) {
  return workTechApiClient<RuleDto[]>({
    method: 'GET',
    url: API_ENDPOINT_PATH.RULE_SETS.LIST_RULES({ ruleSetId }),
    ...otherParams,
  })
}

export function addRule({
  ruleSetId,
  data,
  otherParams = {},
}: {
  ruleSetId: string
  data: RuleRequest
  otherParams?: RequestParams
}) {
  return workTechApiClient<RuleDto>({
    method: 'POST',
    url: API_ENDPOINT_PATH.RULE_SETS.ADD_RULE({ ruleSetId }),
    data,
    ...otherParams,
  })
}

export function updateRule({
  ruleSetId,
  ruleId,
  data,
  otherParams = {},
}: {
  ruleSetId: string
  ruleId: string
  data: RuleRequest
  otherParams?: RequestParams
}) {
  return workTechApiClient<RuleDto>({
    method: 'PUT',
    url: API_ENDPOINT_PATH.RULE_SETS.UPDATE_RULE({ ruleSetId, ruleId }),
    data,
    ...otherParams,
  })
}

export function deleteRule({
  ruleSetId,
  ruleId,
  otherParams = {},
}: {
  ruleSetId: string
  ruleId: string
  otherParams?: RequestParams
}) {
  return workTechApiClient<ApiResponse>({
    method: 'DELETE',
    url: API_ENDPOINT_PATH.RULE_SETS.DELETE_RULE({ ruleSetId, ruleId }),
    ...otherParams,
  })
}
