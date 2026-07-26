package ru.worktechlab.work_task.dto.voice;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Getter;

/** Ответ улучшения текста (ТП-208). */
@Getter
@AllArgsConstructor
public class VoiceEnhanceResponseDto {

    @Schema(description = "Итоговый текст — улучшенный либо исходный (фолбэк)")
    private final String text;

    @Schema(description = "true, если текст реально улучшен DeepSeek; false — фолбэк на исходный")
    private final boolean enhanced;

    public static VoiceEnhanceResponseDto fallback(String originalText) {
        return new VoiceEnhanceResponseDto(originalText, false);
    }
}
