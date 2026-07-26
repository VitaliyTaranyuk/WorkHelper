package ru.worktechlab.work_task.services;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import ru.worktechlab.work_task.dto.voice.VoiceEnhanceMode;
import ru.worktechlab.work_task.dto.voice.VoiceEnhanceResponseDto;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * ТП-208: пустой ключ = функция выключена (честный фолбэк, без сетевого
 * вызова — так же, как GitHubDevPanelService при незаданном репозитории).
 * Сетевой happy-path DeepSeek в проекте не мокается (нет WebClient/wiremock,
 * см. GitHubDevPanelServiceTest) — тестируются чистые методы сборки запроса
 * и разбора ответа.
 */
class DeepSeekVoiceEnhancementServiceTest {

    private DeepSeekVoiceEnhancementService service;

    @BeforeEach
    void setUp() {
        service = new DeepSeekVoiceEnhancementService();
    }

    @Test
    void blankApiKeyDisablesEnhancement_returnsOriginalTextUnmodified() {
        ReflectionTestUtils.setField(service, "apiKey", "");

        VoiceEnhanceResponseDto result = service.enhance("привет мир", VoiceEnhanceMode.DICTATION);

        assertThat(result.isEnhanced()).isFalse();
        assertThat(result.getText()).isEqualTo("привет мир");
    }

    @Test
    void blankTextReturnsFallbackEvenWithConfiguredKey() {
        ReflectionTestUtils.setField(service, "apiKey", "sk-configured");

        VoiceEnhanceResponseDto result = service.enhance("   ", VoiceEnhanceMode.TITLE);

        assertThat(result.isEnhanced()).isFalse();
    }

    @Test
    void systemPromptDiffersByMode() {
        assertThat(DeepSeekVoiceEnhancementService.systemPromptFor(VoiceEnhanceMode.DICTATION))
                .contains("распознанный");
        assertThat(DeepSeekVoiceEnhancementService.systemPromptFor(VoiceEnhanceMode.TITLE))
                .contains("название");
    }

    @Test
    void buildRequestBodyIncludesModelAndBothMessages() {
        String body = DeepSeekVoiceEnhancementService.buildRequestBody(
                "deepseek-v4-flash", "system prompt", "user text");

        assertThat(body).contains("\"model\":\"deepseek-v4-flash\"");
        assertThat(body).contains("\"content\":\"system prompt\"");
        assertThat(body).contains("\"content\":\"user text\"");
    }

    @Test
    void parseContentExtractsMessageFromChatCompletionResponse() throws Exception {
        String response = "{\"choices\":[{\"message\":{\"content\":\"Исправить название\"}}]}";

        String content = DeepSeekVoiceEnhancementService.parseContent(response, new ObjectMapper());

        assertThat(content).isEqualTo("Исправить название");
    }

    @Test
    void parseContentThrowsOnMissingChoices() {
        String response = "{\"error\":\"bad request\"}";

        assertThatThrownBy(() ->
                DeepSeekVoiceEnhancementService.parseContent(response, new ObjectMapper()))
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void sanitizeStripsWrappingQuotesAndClipsTitleLength() {
        assertThat(DeepSeekVoiceEnhancementService.sanitize("«Исправить баг»", VoiceEnhanceMode.TITLE))
                .isEqualTo("Исправить баг");
        assertThat(DeepSeekVoiceEnhancementService.sanitize("\"Добавить фильтр\"", VoiceEnhanceMode.TITLE))
                .isEqualTo("Добавить фильтр");

        String tooLong = "x".repeat(250);
        assertThat(DeepSeekVoiceEnhancementService.sanitize(tooLong, VoiceEnhanceMode.TITLE))
                .hasSize(200);
    }
}
