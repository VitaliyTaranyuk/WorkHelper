package ru.worktechlab.work_task.dto.voice;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Getter;

/** Ответ улучшения текста (ТП-208; режим TASK_DRAFT — ТП-212). */
@Getter
@AllArgsConstructor
public class VoiceEnhanceResponseDto {

    @Schema(description = "Итоговый текст — улучшенный либо исходный (фолбэк)")
    private final String text;

    @Schema(description = "true, если текст реально улучшен DeepSeek; false — фолбэк на исходный")
    private final boolean enhanced;

    @Schema(description = "Название задачи — только для режима TASK_DRAFT, иначе null")
    private final String title;

    @Schema(description = "Описание задачи — только для режима TASK_DRAFT, иначе null")
    private final String description;

    /**
     * Фолбэк: клиенту возвращается ровно то, что он прислал (локальный
     * детерминированный результат). Поля черновика пустые — фронтенд в этом
     * случае остаётся на собственном разборе текста (ТП-212).
     */
    public static VoiceEnhanceResponseDto fallback(String originalText) {
        return new VoiceEnhanceResponseDto(originalText, false, null, null);
    }

    /** Улучшенный текст (DICTATION/TITLE). */
    public static VoiceEnhanceResponseDto enhanced(String text) {
        return new VoiceEnhanceResponseDto(text, true, null, null);
    }

    /** Черновик задачи (TASK_DRAFT): название + описание одним вызовом. */
    public static VoiceEnhanceResponseDto draft(String title, String description) {
        return new VoiceEnhanceResponseDto(description, true, title, description);
    }
}
