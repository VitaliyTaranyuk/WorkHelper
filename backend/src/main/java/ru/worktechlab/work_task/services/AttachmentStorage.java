package ru.worktechlab.work_task.services;

import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

/**
 * Файловое хранилище вложений: единая точка работы с диском для
 * TaskAttachmentService (загрузка/скачивание/удаление) и TaskService
 * (очистка файлов при удалении задачи — ТП-30/BUG: FK task_attachment
 * блокировал удаление задач с вложениями).
 */
@Component
@Slf4j
public class AttachmentStorage {

    @Value("${app.attachments.storage-dir:/var/lib/workhelper/attachments}")
    private String storageDirSetting;

    private Path storageRoot;

    @PostConstruct
    void initStorage() throws IOException {
        storageRoot = Paths.get(storageDirSetting).toAbsolutePath().normalize();
        Files.createDirectories(storageRoot);
        log.info("Attachment storage root: {}", storageRoot);
    }

    public Path root() {
        return storageRoot;
    }

    /** Абсолютный путь файла вложения по относительному пути из БД. */
    public Path resolve(String relativePath) {
        return storageRoot.resolve(relativePath).normalize();
    }

    /**
     * Удалить файл вложения; ошибки не пробрасываются (метаданные уже удалены,
     * осиротевший файл — лог, не блокируем операцию пользователя).
     */
    public void deleteQuietly(String relativePath) {
        Path file = resolve(relativePath);
        try {
            if (file.startsWith(storageRoot) && Files.exists(file)) {
                Files.delete(file);
            }
        } catch (IOException e) {
            log.warn("Не удалось удалить файл {}: {}", file, e.getMessage());
        }
    }
}
