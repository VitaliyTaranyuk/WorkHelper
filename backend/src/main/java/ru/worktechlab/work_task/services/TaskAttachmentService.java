package ru.worktechlab.work_task.services;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import ru.worktechlab.work_task.dto.UserAndProjectData;
import ru.worktechlab.work_task.dto.attachments.AttachmentDto;
import ru.worktechlab.work_task.exceptions.BadRequestException;
import ru.worktechlab.work_task.exceptions.NotFoundException;
import ru.worktechlab.work_task.models.tables.TaskAttachment;
import ru.worktechlab.work_task.models.tables.TaskModel;
import ru.worktechlab.work_task.repositories.TaskAttachmentRepository;
import ru.worktechlab.work_task.utils.CheckerUtil;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.List;
import java.util.UUID;

/**
 * Хранилище вложений: метаданные в БД, содержимое в файловой системе по пути
 * {storage-dir}/{taskId}/{uuid}-{safeFileName}. По образцу Jira/ClickUp:
 *  - 25 MB лимит на один файл (защита от загрузки гигантов в общую БД);
 *  - sanitize имени файла (защита от path-traversal);
 *  - удаление atomically: сначала запись из БД, потом файл с диска.
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class TaskAttachmentService {

    public static final long MAX_FILE_SIZE_BYTES = 25L * 1024 * 1024;

    private final TaskAttachmentRepository attachmentRepository;
    private final TaskService taskService;
    private final CheckerUtil checkerUtil;

    @Value("${app.attachments.storage-dir:/var/lib/workhelper/attachments}")
    private String storageDirSetting;

    private Path storageRoot;

    @PostConstruct
    void initStorage() throws IOException {
        storageRoot = Paths.get(storageDirSetting).toAbsolutePath().normalize();
        Files.createDirectories(storageRoot);
        log.info("Attachment storage root: {}", storageRoot);
    }

    @Transactional(readOnly = true)
    public List<AttachmentDto> list(String projectId, String taskId) throws NotFoundException {
        checkerUtil.findAndCheckProjectUserData(projectId, false, false);
        TaskModel task = taskService.findTaskByIdOrThrow(taskId);
        if (!task.getProject().getId().equals(projectId)) {
            throw new NotFoundException("Задача не принадлежит указанному проекту");
        }
        return attachmentRepository.findByTaskIdOrderByUploadedAtDesc(taskId).stream()
                .map(this::toDto).toList();
    }

    @Transactional
    public AttachmentDto upload(String projectId, String taskId, MultipartFile file)
            throws NotFoundException, BadRequestException, IOException {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("Файл пуст или не передан");
        }
        if (file.getSize() > MAX_FILE_SIZE_BYTES) {
            throw new BadRequestException(
                    "Файл слишком большой: " + (file.getSize() / 1024 / 1024) + " MB. Лимит — 25 MB");
        }
        UserAndProjectData data = checkerUtil.findAndCheckProjectUserData(projectId, false, false);
        TaskModel task = taskService.findTaskByIdOrThrow(taskId);
        if (!task.getProject().getId().equals(projectId)) {
            throw new NotFoundException("Задача не принадлежит указанному проекту");
        }

        String safeName = sanitizeFileName(file.getOriginalFilename());
        String relativePath = taskId + "/" + UUID.randomUUID() + "-" + safeName;
        Path target = storageRoot.resolve(relativePath).normalize();
        if (!target.startsWith(storageRoot)) {
            throw new BadRequestException("Недопустимый путь хранения");
        }
        Files.createDirectories(target.getParent());
        try (var in = file.getInputStream()) {
            Files.copy(in, target, StandardCopyOption.REPLACE_EXISTING);
        }

        TaskAttachment a = new TaskAttachment();
        a.setTask(task);
        a.setUploadedBy(data.getUser());
        a.setFileName(safeName);
        a.setContentType(file.getContentType() != null ? file.getContentType() : "application/octet-stream");
        a.setSizeBytes(file.getSize());
        a.setStoragePath(relativePath);
        attachmentRepository.saveAndFlush(a);
        log.info("Attachment uploaded: task={} file={} size={}B", taskId, safeName, file.getSize());
        return toDto(a);
    }

    @Transactional(readOnly = true)
    public DownloadHandle download(String projectId, String taskId, String attachmentId)
            throws NotFoundException, BadRequestException {
        checkerUtil.findAndCheckProjectUserData(projectId, false, false);
        TaskAttachment a = attachmentRepository.findById(attachmentId)
                .orElseThrow(() -> new NotFoundException("Вложение не найдено"));
        if (!a.getTask().getId().equals(taskId) || !a.getTask().getProject().getId().equals(projectId)) {
            throw new NotFoundException("Вложение не относится к задаче/проекту");
        }
        Path file = storageRoot.resolve(a.getStoragePath()).normalize();
        if (!file.startsWith(storageRoot) || !Files.exists(file)) {
            throw new NotFoundException("Файл вложения отсутствует на диске");
        }
        return new DownloadHandle(a.getFileName(), a.getContentType(), new FileSystemResource(file.toFile()));
    }

    @Transactional
    public void delete(String projectId, String taskId, String attachmentId)
            throws NotFoundException {
        checkerUtil.findAndCheckProjectUserData(projectId, false, false);
        TaskAttachment a = attachmentRepository.findById(attachmentId)
                .orElseThrow(() -> new NotFoundException("Вложение не найдено"));
        if (!a.getTask().getId().equals(taskId) || !a.getTask().getProject().getId().equals(projectId)) {
            throw new NotFoundException("Вложение не относится к задаче/проекту");
        }
        Path file = storageRoot.resolve(a.getStoragePath()).normalize();
        attachmentRepository.delete(a);
        try {
            if (file.startsWith(storageRoot) && Files.exists(file)) {
                Files.delete(file);
            }
        } catch (IOException e) {
            // Метаданные удалены; файл осиротел — лог и продолжаем, чтобы не блокировать UX.
            log.warn("Не удалось удалить файл {}: {}", file, e.getMessage());
        }
    }

    private AttachmentDto toDto(TaskAttachment a) {
        return new AttachmentDto(
                a.getId(),
                a.getFileName(),
                a.getContentType(),
                a.getSizeBytes(),
                a.getUploadedAt(),
                a.getUploadedBy().getId(),
                userDisplay(a)
        );
    }

    private String userDisplay(TaskAttachment a) {
        String last = a.getUploadedBy().getLastName();
        String first = a.getUploadedBy().getFirstName();
        return ((last == null ? "" : last) + " " + (first == null ? "" : first)).trim();
    }

    private static String sanitizeFileName(String original) {
        if (original == null || original.isBlank()) return "file";
        String base = Paths.get(original).getFileName().toString();
        // Запрещаем path-разделители и управляющие символы.
        String safe = base.replaceAll("[\\\\/:*?\"<>|\\p{Cntrl}]", "_").trim();
        if (safe.isBlank() || safe.equals(".") || safe.equals("..")) return "file";
        return safe.length() > 200 ? safe.substring(0, 200) : safe;
    }

    public record DownloadHandle(String fileName, String contentType, FileSystemResource resource) {}
}
