import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { workTechApiClient } from '@/shared/api/workTechHttpClient'
import { toast } from 'sonner'

export type AttachmentDto = {
  id: string
  fileName: string
  contentType: string
  sizeBytes: number
  uploadedAt: string
  uploadedById: string
  uploadedByName: string
}

const base = (projectId: string, taskId: string) =>
  `/tasks/${projectId}/${taskId}/attachments`

export function useTaskAttachments({
  projectId,
  taskId,
}: {
  projectId: string | undefined
  taskId: string | undefined
}) {
  return useQuery<AttachmentDto[]>({
    queryKey: ['taskAttachments', projectId, taskId],
    queryFn: () =>
      workTechApiClient<AttachmentDto[]>({
        method: 'GET',
        url: base(projectId as string, taskId as string),
      }).then((r) => r.data ?? []),
    enabled: !!projectId && !!taskId,
  })
}

/**
 * Императивная загрузка файла к задаче — используется и мутацией карточки,
 * и формой создания (ТП-30: отложенные вложения грузятся после create).
 */
export async function uploadAttachmentFile(
  projectId: string,
  taskId: string,
  file: File,
): Promise<AttachmentDto> {
  const form = new FormData()
  form.append('file', file)
  const res = await workTechApiClient<AttachmentDto>({
    method: 'POST',
    url: base(projectId, taskId),
    data: form,
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return res.data
}

export function useUploadAttachment({
  projectId,
  taskId,
}: {
  projectId: string
  taskId: string
}) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => uploadAttachmentFile(projectId, taskId, file),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['taskAttachments', projectId, taskId] })
      toast.success('Файл загружен')
    },
  })
}

export function useDeleteAttachment({
  projectId,
  taskId,
}: {
  projectId: string
  taskId: string
}) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (attachmentId: string) =>
      workTechApiClient({
        method: 'DELETE',
        url: `${base(projectId, taskId)}/${attachmentId}`,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['taskAttachments', projectId, taskId] })
      toast.success('Вложение удалено')
    },
    onError: () => toast.error('Не удалось удалить вложение'),
  })
}

/**
 * Скачивание файла вложения авторизованным запросом (endpoint требует JWT,
 * прямые <a href>/<img src> без заголовка Authorization получают 401).
 * Возвращает blob содержимого файла.
 */
export async function fetchAttachmentBlob(
  projectId: string,
  taskId: string,
  attachmentId: string,
): Promise<Blob> {
  const res = await workTechApiClient<Blob>({
    method: 'GET',
    url: `${base(projectId, taskId)}/${attachmentId}/download`,
    responseType: 'blob',
  })
  return res.data
}

/**
 * Blob-URL содержимого вложения (для <img>). Кэшируется react-query;
 * object URL живёт, пока запись есть в кэше — это осознанный компромисс
 * (объём ограничен превью открытой карточки).
 */
export function useAttachmentBlobUrl({
  projectId,
  taskId,
  attachmentId,
  enabled = true,
}: {
  projectId: string
  taskId: string
  attachmentId: string
  enabled?: boolean
}) {
  return useQuery({
    queryKey: ['attachmentBlob', projectId, taskId, attachmentId],
    queryFn: async () => {
      const blob = await fetchAttachmentBlob(projectId, taskId, attachmentId)
      return URL.createObjectURL(blob)
    },
    enabled,
    staleTime: Infinity,
  })
}

/** Типы, которые браузер отображает сам — такие вложения открываем в новой вкладке (ТП-53). */
export function isBrowserViewable(contentType: string | null | undefined): boolean {
  const t = (contentType || '').toLowerCase()
  return (
    t.startsWith('image/') ||
    t.startsWith('text/') ||
    t === 'application/pdf' ||
    t === 'application/json'
  )
}

/**
 * Открыть вложение в новой вкладке. Вкладка открывается синхронно в обработчике
 * клика (иначе popup-блокировка), содержимое подставляется после авторизованной
 * загрузки blob.
 */
export async function openAttachmentInNewTab(
  projectId: string,
  taskId: string,
  att: AttachmentDto,
) {
  const win = window.open('about:blank', '_blank')
  if (!win) {
    toast.error('Браузер заблокировал открытие вкладки')
    return
  }
  try {
    const blob = await fetchAttachmentBlob(projectId, taskId, att.id)
    // content-type определяет, отобразит ли браузер файл или скачает его
    const typed = blob.type ? blob : new Blob([blob], { type: att.contentType })
    const url = URL.createObjectURL(typed)
    win.location.href = url
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
  } catch {
    win.close()
    toast.error(`Не удалось открыть «${att.fileName}»`)
  }
}

/** Скачать вложение в файл (через blob + временную ссылку). */
export async function downloadAttachment(
  projectId: string,
  taskId: string,
  att: AttachmentDto,
) {
  const blob = await fetchAttachmentBlob(projectId, taskId, att.id)
  const url = URL.createObjectURL(blob)
  try {
    const link = document.createElement('a')
    link.href = url
    link.download = att.fileName
    document.body.appendChild(link)
    link.click()
    link.remove()
  } finally {
    // отложенный revoke: браузеру нужно успеть начать скачивание
    setTimeout(() => URL.revokeObjectURL(url), 10_000)
  }
}
