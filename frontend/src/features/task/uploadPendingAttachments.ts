import { notify as toast } from '@/shared/ui/notify'
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
  for (const file of files) {
    try {
      await uploadAttachmentFile(projectId, taskId, file)
    } catch {
      toast.error(`Не удалось загрузить «${file.name}» — добавьте его в карточке задачи`)
    }
  }
  // ТП-71: success-тост о вложениях убран — файлы видны в карточке задачи,
  // отдельное подтверждение дублирует информацию. Ошибки показываются выше.
}
