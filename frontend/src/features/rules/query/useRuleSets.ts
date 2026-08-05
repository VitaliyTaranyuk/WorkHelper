import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { workTechApi } from '@/shared/api/endpoint'
import type { RuleRequest, RuleSetRequest } from '@/shared/api/endpoint/rulesApi'
import { extractGeneralError } from '@/shared/api/extractFieldErrors'
import { notify as toast } from '@/shared/ui/notify'

/**
 * T-511: наборы правил и правила.
 *
 * Уровень набора выражен одним признаком — есть проект или нет (ADR-018), и
 * тот же признак работает ключом кэша: у общих правил пользователя и у правил
 * проекта разные ключи, поэтому переключение проекта не подмешивает чужие
 * данные (урок T-500).
 */
export const ruleSetsKey = (projectId: string | undefined) =>
  ['ruleSets', projectId ?? 'my'] as const

export const rulesKey = (ruleSetId: string) => ['rules', ruleSetId] as const

export function useRuleSets(projectId: string | undefined) {
  return useQuery({
    queryKey: ruleSetsKey(projectId),
    queryFn: () =>
      (projectId
        ? workTechApi.rule.getProjectRuleSets({ projectId })
        : workTechApi.rule.getMyRuleSets()
      ).then((res) => res.data),
  })
}

export function useRules(ruleSetId: string | undefined) {
  return useQuery({
    queryKey: rulesKey(ruleSetId ?? ''),
    queryFn: () =>
      workTechApi.rule.getRules({ ruleSetId: ruleSetId! }).then((res) => res.data),
    enabled: !!ruleSetId,
  })
}

function useInvalidateSets(projectId: string | undefined) {
  const queryClient = useQueryClient()
  return () =>
    queryClient.invalidateQueries({ queryKey: ruleSetsKey(projectId) })
}

export function useCreateRuleSet(projectId: string | undefined) {
  const invalidate = useInvalidateSets(projectId)
  return useMutation({
    mutationFn: (data: RuleSetRequest) =>
      projectId
        ? workTechApi.rule.createProjectRuleSet({ projectId, data })
        : workTechApi.rule.createMyRuleSet({ data }),
    onSuccess: () => void invalidate(),
    onError: (error) => toast.error(message(error, 'Не удалось создать набор правил')),
  })
}

export function useDeleteRuleSet(projectId: string | undefined) {
  const invalidate = useInvalidateSets(projectId)
  return useMutation({
    mutationFn: (ruleSetId: string) => workTechApi.rule.deleteRuleSet({ ruleSetId }),
    onSuccess: () => void invalidate(),
    onError: (error) => toast.error(message(error, 'Не удалось удалить набор правил')),
  })
}

/**
 * После изменения правил обновляются два запроса: список правил набора и сам
 * список наборов — в нём показано число правил, и без инвалидации счётчик
 * разошёлся бы с содержимым.
 */
function useInvalidateRules(projectId: string | undefined, ruleSetId: string) {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: rulesKey(ruleSetId) })
    void queryClient.invalidateQueries({ queryKey: ruleSetsKey(projectId) })
  }
}

export function useSaveRule(projectId: string | undefined, ruleSetId: string) {
  const invalidate = useInvalidateRules(projectId, ruleSetId)
  return useMutation({
    mutationFn: ({ ruleId, data }: { ruleId?: string; data: RuleRequest }) =>
      ruleId
        ? workTechApi.rule.updateRule({ ruleSetId, ruleId, data })
        : workTechApi.rule.addRule({ ruleSetId, data }),
    onSuccess: () => invalidate(),
    // Причина отказа приходит с сервера понятной (K-34) — показываем её, а не
    // общую фразу: «правило K-01 уже есть в этом наборе» пользователю полезнее.
    onError: (error) => toast.error(message(error, 'Не удалось сохранить правило')),
  })
}

export function useDeleteRule(projectId: string | undefined, ruleSetId: string) {
  const invalidate = useInvalidateRules(projectId, ruleSetId)
  return useMutation({
    mutationFn: (ruleId: string) => workTechApi.rule.deleteRule({ ruleSetId, ruleId }),
    onSuccess: () => invalidate(),
    onError: (error) => toast.error(message(error, 'Не удалось удалить правило')),
  })
}

function message(error: unknown, fallback: string): string {
  return extractGeneralError(error) ?? fallback
}
