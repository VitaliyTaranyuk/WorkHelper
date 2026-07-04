import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { workTechApi } from '@/shared/api/endpoint'
import type { UserSettingsDto } from '@/shared/api/endpoint/usersApi'
import { notify } from '@/shared/ui/notify'

const QUERY_KEY = ['userSettings']

/** Серверные настройки уведомлений (ТП-65). */
export function useNotificationSettings() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => workTechApi.user.getUserSettings().then((r) => r.data),
  })
}

export function useUpdateNotificationSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: UserSettingsDto) =>
      workTechApi.user.updateUserSettings({ data }).then((r) => r.data),
    onSuccess: (data) => {
      qc.setQueryData(QUERY_KEY, data)
      notify.success('Настройки уведомлений сохранены')
    },
    onError: () => notify.error('Не удалось сохранить настройки уведомлений'),
  })
}
