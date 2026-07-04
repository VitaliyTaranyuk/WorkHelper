package ru.worktechlab.work_task.dto.users;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Schema(description = "Настройки уведомлений пользователя (ТП-65)")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class UserSettingsDto {

    @Schema(description = "Уведомлять об упоминаниях (@username)")
    private boolean notifyMentions;

    @Schema(description = "Уведомлять о создании задачи")
    private boolean notifyTaskCreated;

    @Schema(description = "Напоминать о встречах")
    private boolean notifyMeetings;

    @Schema(description = "За сколько минут до встречи напоминать", example = "15")
    @Min(value = 1, message = "Минимум 1 минута")
    @Max(value = 1440, message = "Максимум 1440 минут (сутки)")
    private int reminderMinutes;
}
