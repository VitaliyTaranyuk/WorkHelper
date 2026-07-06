package ru.worktechlab.work_task.dto.meet;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Создание комнаты Meet: без контекста (быстрая встреча), из календарной
 * встречи (meetingId) или из задачи (taskId). Для встречи/задачи создание
 * идемпотентно — действующая комната возвращается повторно.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class CreateMeetRoomRequest {

    @Schema(description = "Календарная встреча, к которой привязана комната")
    private String meetingId;

    @Schema(description = "Задача, к которой привязана комната")
    private String taskId;

    @Schema(description = "Название комнаты (по умолчанию — из встречи/задачи)")
    @Size(max = 255, message = "Название не должно превышать 255 символов")
    private String title;
}
