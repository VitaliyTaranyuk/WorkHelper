package ru.worktechlab.work_task.controllers;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.annotation.security.RolesAllowed;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.FileSystemResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import ru.worktechlab.work_task.dto.attachments.AttachmentDto;
import ru.worktechlab.work_task.exceptions.BadRequestException;
import ru.worktechlab.work_task.exceptions.NotFoundException;
import ru.worktechlab.work_task.services.TaskAttachmentService;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.List;

import static ru.worktechlab.work_task.models.enums.Roles.Fields.*;

@RestController
@RequestMapping("work-task/api/v1/tasks/{projectId}/{taskId}/attachments")
@RequiredArgsConstructor
@Tag(name = "Task Attachments", description = "Вложения задачи")
public class TaskAttachmentController {

    private final TaskAttachmentService service;

    @RolesAllowed({PROJECT_MEMBER, PROJECT_OWNER, POWER_USER, ADMIN})
    @GetMapping
    @Operation(summary = "Список вложений задачи")
    public List<AttachmentDto> list(@PathVariable String projectId,
                                    @PathVariable String taskId) throws NotFoundException {
        return service.list(projectId, taskId);
    }

    @RolesAllowed({PROJECT_MEMBER, PROJECT_OWNER, POWER_USER, ADMIN})
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Загрузить вложение")
    public AttachmentDto upload(@PathVariable String projectId,
                                @PathVariable String taskId,
                                @RequestParam("file") MultipartFile file)
            throws NotFoundException, BadRequestException, IOException {
        return service.upload(projectId, taskId, file);
    }

    @RolesAllowed({PROJECT_MEMBER, PROJECT_OWNER, POWER_USER, ADMIN})
    @GetMapping("/{attachmentId}/download")
    @Operation(summary = "Скачать файл вложения")
    public ResponseEntity<FileSystemResource> download(@PathVariable String projectId,
                                                       @PathVariable String taskId,
                                                       @PathVariable String attachmentId)
            throws NotFoundException, BadRequestException {
        TaskAttachmentService.DownloadHandle h = service.download(projectId, taskId, attachmentId);
        String encoded = URLEncoder.encode(h.fileName(), StandardCharsets.UTF_8).replace("+", "%20");
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + h.fileName() + "\"; filename*=UTF-8''" + encoded)
                .contentType(MediaType.parseMediaType(h.contentType()))
                .body(h.resource());
    }

    @RolesAllowed({PROJECT_MEMBER, PROJECT_OWNER, POWER_USER, ADMIN})
    @DeleteMapping("/{attachmentId}")
    @Operation(summary = "Удалить вложение")
    public void delete(@PathVariable String projectId,
                       @PathVariable String taskId,
                       @PathVariable String attachmentId)
            throws NotFoundException {
        service.delete(projectId, taskId, attachmentId);
    }
}
