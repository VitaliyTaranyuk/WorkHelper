package ru.worktechlab.work_task.controllers;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import ru.worktechlab.work_task.dto.voice.VoiceEnhanceRequestDto;
import ru.worktechlab.work_task.dto.voice.VoiceEnhanceResponseDto;
import ru.worktechlab.work_task.services.DeepSeekVoiceEnhancementService;

/**
 * Улучшение текста голосового ввода (ТП-208): прокси к DeepSeek — ключ
 * провайдера остаётся на сервере, фронтенд его никогда не видит. Открыт
 * только авторизованным пользователям (общее правило SecurityConfig:
 * anyRequest().authenticated()).
 */
@RestController
@RequestMapping("work-task/api/v1/voice")
@RequiredArgsConstructor
@Tag(name = "Voice", description = "Улучшение текста голосового ввода через DeepSeek")
public class VoiceController {

    private final DeepSeekVoiceEnhancementService deepSeekVoiceEnhancementService;

    @PostMapping("/enhance-text")
    @Operation(summary = "Улучшить распознанный текст или сформулировать название задачи через DeepSeek")
    public VoiceEnhanceResponseDto enhanceText(@RequestBody @Valid VoiceEnhanceRequestDto request) {
        return deepSeekVoiceEnhancementService.enhance(request.getText(), request.getMode());
    }
}
