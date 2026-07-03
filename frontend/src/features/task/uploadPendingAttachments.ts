import { toast } from 'sonner'
import { uploadAttachmentFile } from './useTaskAttachments'

/**
 * Загрузка отложенных вложений к только что созданной задаче (ТП-30).
 * Задача уже создана — ошибки загрузки отдельных файлов не отменяют её,
 * а показываются пользователю (файл можно доложить в карточке).
 */
export async function uploadPendingAttachments(
  projectId: string,
  taskId: string,
  files: File[],
): Promise<void> {
  if (files.length === 0) return
  let uploaded = 0
  for (const file of files) {
    try {
      await uploadAttachmentFile(projectId, taskId, file)
      uploaded++
    } catch {
      toast.error(`Не удалось загрузить «${file.name}» — добавьте его в карточке задачи`)
    }
  }
  if (uploaded > 0) {
    toast.success(`Вложений загружено: ${uploaded} из ${files.length}`)
  }
}
