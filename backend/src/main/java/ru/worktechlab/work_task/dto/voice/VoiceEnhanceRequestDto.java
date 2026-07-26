package ru.worktechlab.work_task.dto.voice;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Запрос улучшения текста через DeepSeek (ТП-208). */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class VoiceEnhanceRequestDto {

    @Schema(description = "Исходный (локально отформатированный) текст")
    @NotBlank(message = "Текст не должен быть пустым")
    @Size(max = 4000, message = "Текст не должен превышать 4000 символов")
    private String text;

    @Schema(description = "Режим улучшения")
    @NotNull(message = "Режим не указан")
    private VoiceEnhanceMode mode;
}
