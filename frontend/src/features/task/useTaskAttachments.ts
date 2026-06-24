import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { workTechApiClient } from '@/shared/api/workTechHttpClient'
import {
  WORKTECH_API_BASE_URL,
  WORKTECH_API_PREFIX,
  WORKTECH_API_VERSION,
} from '@/config'
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

export function useUploadAttachment({
  projectId,
  taskId,
}: {
  projectId: string
  taskId: string
}) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData()
      form.append('file', file)
      const res = await workTechApiClient<AttachmentDto>({
        method: 'POST',
        url: base(projectId, taskId),
        data: form,
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      return res.data
    },
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

/** Абсолютный URL для прямого скачивания (для копирования / открытия). */
export function attachmentDownloadUrl(
  projectId: string,
  taskId: string,
  attachmentId: string,
) {
  return `${WORKTECH_API_BASE_URL}/${WORKTECH_API_PREFIX}/${WORKTECH_API_VERSION}${base(projectId, taskId)}/${attachmentId}/download`
}
