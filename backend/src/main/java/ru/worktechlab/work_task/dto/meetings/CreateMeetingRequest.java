package ru.worktechlab.work_task.dto.meetings;

import com.fasterxml.jackson.annotation.JsonFormat;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.List;

@Schema(description = "Создание/редактирование встречи")
@Getter
@Setter
@NoArgsConstructor
public class CreateMeetingRequest {

    @Schema(description = "Название встречи")
    @NotBlank(message = "Название не может быть пустым")
    private String title;

    @Schema(description = "Описание")
    private String description;

    @Schema(description = "Начало", example = "2026-06-22T10:00:00")
    @NotNull(message = "Дата начала обязательна")
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime startAt;

    @Schema(description = "Окончание", example = "2026-06-22T11:00:00")
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime endAt;

    @Schema(description = "Ссылка на встречу (Яндекс Телемост и т.п.)", example = "https://telemost.yandex.ru/j/12345")
    @Size(max = 2048, message = "Ссылка не должна превышать 2048 символов")
    @Pattern(regexp = "^https?://.+", message = "Ссылка должна начинаться с http:// или https://")
    private String link;

    @Schema(description = "ИД участников из рабочего пространства проекта")
    private List<String> participantIds;
}
