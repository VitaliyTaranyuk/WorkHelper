import React from 'react'
import { MutationCache, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { Mutation } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import { extractGeneralError } from '@/shared/api/extractFieldErrors'
import { notify } from '@/shared/ui/notify'

const FALLBACK_MESSAGE = 'Не удалось выполнить действие. Попробуйте ещё раз.'

/**
 * TD-045: страховка от молчаливого отказа мутаций.
 *
 * Класс BUG-014 («мутации без onError молча игнорируют ошибки») закрывали
 * 2026-06-22 расстановкой обработчиков по местам — и он вернулся в новом коде,
 * потому что механизма против повторения заведено не было. Расставлять onError
 * заново значило бы ждать третьего раза; здесь заводится именно механизм.
 *
 * ДВА УСЛОВИЯ МОЛЧАНИЯ — оба обязательны, иначе фикс сделает хуже:
 *
 * 1. У мутации есть СВОЙ onError. Тогда общий тост не только дублирует, но и
 *    вредит: формы создания задачи ловят ошибку и подсвечивают конкретные поля
 *    (см. комментарий в useCreateTask), а generic-сообщение скрыло бы причину.
 *    Локальная обработка всегда главнее общей.
 *
 * 2. Статус 401. Его ведёт apiMiddleware: обновляет токен, а при неудаче
 *    отправляет на вход. Тост здесь — шум поверх уже начатого сценария.
 *
 * Текст берётся существующим extractGeneralError (K-22), наружу идёт понятное
 * сообщение, технические детали остаются в консоли (K-34).
 */
export function handleMutationError(
  error: unknown,
  mutation: Pick<Mutation<unknown, unknown, unknown, unknown>, 'options'>,
): void {
  if (mutation.options.onError) return
  if (error instanceof AxiosError && error.response?.status === 401) return

  console.error('[mutation]', error)
  notify.error(extractGeneralError(error) ?? FALLBACK_MESSAGE)
}

/**
 * Ретраи имеют смысл только для временных сбоев (сеть, 5xx).
 * Клиентские ошибки (4xx) детерминированы: повтор даст тот же ответ —
 * 404 по удалённой задаче ретраился 3 раза и лишь откладывал ошибку UI.
 */
export function shouldRetryQuery(failureCount: number, error: unknown): boolean {
  const status = (error as { response?: { status?: number } })?.response?.status
  if (status !== undefined && status >= 400 && status < 500) return false
  return failureCount < 3
}

const queryClient = new QueryClient({
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) =>
      handleMutationError(error, mutation),
  }),
  defaultOptions: {
    queries: {
      retry: shouldRetryQuery,
      // Свежесть данных обеспечивают поллинг (ТП-47) и invalidateQueries
      // после мутаций; ненулевой staleTime убирает шторм повторных GET
      // при каждой навигации (projects/for-user, project/{id} и т.п.).
      staleTime: 15_000,
    },
  },
})

interface ProviderProps {
  children: React.ReactNode
}

export const QueryProvider: React.FC<ProviderProps> = ({ children }) => {
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}
