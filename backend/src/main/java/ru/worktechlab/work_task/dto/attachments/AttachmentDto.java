package ru.worktechlab.work_task.dto.attachments;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Вложение задачи (метаданные)")
public class AttachmentDto {
    private String id;
    private String fileName;
    private String contentType;
    private long sizeBytes;
    private LocalDateTime uploadedAt;
    private String uploadedById;
    private String uploadedByName;
}
