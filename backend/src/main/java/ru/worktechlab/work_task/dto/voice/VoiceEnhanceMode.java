package ru.worktechlab.work_task.dto.voice;

/** Режим улучшения текста (ТП-208) — определяет системный промпт DeepSeek. */
public enum VoiceEnhanceMode {
    /** Очистка распознанной речи: пунктуация, регистр, слова-паразиты. */
    DICTATION,
    /** Короткое название задачи по тексту постановки. */
    TITLE
}
