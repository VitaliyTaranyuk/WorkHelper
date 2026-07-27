package ru.worktechlab.work_task.services;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import ru.worktechlab.work_task.dto.voice.VoiceEnhanceMode;
import ru.worktechlab.work_task.dto.voice.VoiceEnhanceResponseDto;
import ru.worktechlab.work_task.utils.UserContext;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * ТП-208: пустой ключ = функция выключена (честный фолбэк, без сетевого
 * вызова — так же, как GitHubDevPanelService при незаданном репозитории).
 * Сетевой happy-path DeepSeek в проекте не мокается (нет WebClient/wiremock,
 * см. GitHubDevPanelServiceTest) — тестируются чистые методы сборки запроса,
 * разбора и ВАЛИДАЦИИ ответа (ТП-212).
 */
class DeepSeekVoiceEnhancementServiceTest {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    private DeepSeekVoiceEnhancementService service;

    @BeforeEach
    void setUp() {
        service = new DeepSeekVoiceEnhancementService(
                new UserContext(), new VoiceEnhancementMetrics(), new VoiceEnhancementRateLimiter());
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
        assertThat(DeepSeekVoiceEnhancementService.systemPromptFor(VoiceEnhanceMode.TASK_DRAFT))
                .contains("карточку задачи");
    }

    /** JSON-режим DeepSeek требует слово «json» и пример формата в промпте. */
    @Test
    void everyPromptSatisfiesJsonModeRequirements() {
        for (VoiceEnhanceMode mode : VoiceEnhanceMode.values()) {
            String prompt = DeepSeekVoiceEnhancementService.systemPromptFor(mode);
            assertThat(prompt).containsIgnoringCase("json");
            assertThat(prompt).contains("Пример: {");
        }
    }

    @Test
    void buildRequestBodyIncludesModelJsonFormatAndBothMessages() {
        String body = DeepSeekVoiceEnhancementService.buildRequestBody(
                "deepseek-v4-flash", "system prompt", "user text", 900);

        assertThat(body).contains("\"model\":\"deepseek-v4-flash\"");
        assertThat(body).contains("\"content\":\"system prompt\"");
        assertThat(body).contains("\"content\":\"user text\"");
        assertThat(body).contains("\"max_tokens\":900");
        assertThat(body).contains("\"response_format\":{\"type\":\"json_object\"}");
    }

    /**
     * ТП-212: фиксированные 300 токенов (ТП-208) обрезали длинные диктовки —
     * лимит вывода должен расти вместе с входом.
     */
    @Test
    void maxTokensGrowsWithInputForDictation() {
        int shortText = DeepSeekVoiceEnhancementService.maxTokensFor(
                VoiceEnhanceMode.DICTATION, "короткая фраза");
        int longText = DeepSeekVoiceEnhancementService.maxTokensFor(
                VoiceEnhanceMode.DICTATION, "я".repeat(4000));

        assertThat(longText).isGreaterThan(shortText);
        // Запас на рассуждения модели: лимит заведомо больше длины входа,
        // иначе ответ обрежется и улучшение пропадёт (проверено на проде).
        assertThat(longText).isGreaterThan(4000);
        // Потолок вывода не превышается даже на максимально длинном входе.
        assertThat(longText).isLessThanOrEqualTo(16000);
    }

    @Test
    void maxTokensForTitleIsConstantAndLeavesRoomForReasoning() {
        int title = DeepSeekVoiceEnhancementService.maxTokensFor(VoiceEnhanceMode.TITLE, "x");

        assertThat(title).isEqualTo(DeepSeekVoiceEnhancementService.maxTokensFor(
                VoiceEnhanceMode.TITLE, "я".repeat(4000)));
        // 160 токенов (первая версия ТП-212) обрезали даже короткое название.
        assertThat(title).isGreaterThanOrEqualTo(1000);
    }

    /** Модель периодически оборачивает JSON в ```-блок — это не повод терять улучшение. */
    @Test
    void jsonWrappedInMarkdownFenceIsAccepted() {
        String fenced = "```json\n{\"text\": \"Починить логин на проде.\"}\n```";

        VoiceEnhanceResponseDto result = DeepSeekVoiceEnhancementService.toResponse(
                fenced, VoiceEnhanceMode.DICTATION, "починить логин на проде", MAPPER);

        assertThat(result).isNotNull();
        assertThat(result.getText()).isEqualTo("Починить логин на проде.");
    }

    @Test
    void stripCodeFenceLeavesPlainJsonUntouched() {
        assertThat(DeepSeekVoiceEnhancementService.stripCodeFence("{\"text\":\"a\"}"))
                .isEqualTo("{\"text\":\"a\"}");
    }

    @Test
    void parseContentExtractsMessageFromChatCompletionResponse() throws Exception {
        String response = "{\"choices\":[{\"message\":{\"content\":\"Исправить название\"}}]}";

        String content = DeepSeekVoiceEnhancementService.parseContent(MAPPER.readTree(response));

        assertThat(content).isEqualTo("Исправить название");
    }

    @Test
    void parseContentThrowsOnMissingChoices() throws Exception {
        var response = MAPPER.readTree("{\"error\":\"bad request\"}");

        assertThatThrownBy(() -> DeepSeekVoiceEnhancementService.parseContent(response))
                .isInstanceOf(IllegalStateException.class);
    }

    /** Обрезанный ответ выглядит валидным — он ДОЛЖЕН распознаваться до разбора. */
    @Test
    void truncatedResponseIsDetectedByFinishReason() throws Exception {
        var truncated = MAPPER.readTree(
                "{\"choices\":[{\"finish_reason\":\"length\",\"message\":{\"content\":\"нача\"}}]}");
        var complete = MAPPER.readTree(
                "{\"choices\":[{\"finish_reason\":\"stop\",\"message\":{\"content\":\"всё\"}}]}");

        assertThat(DeepSeekVoiceEnhancementService.isTruncated(truncated)).isTrue();
        assertThat(DeepSeekVoiceEnhancementService.isTruncated(complete)).isFalse();
    }

    @Test
    void dictationResponseIsParsedFromJsonSchema() {
        VoiceEnhanceResponseDto result = DeepSeekVoiceEnhancementService.toResponse(
                "{\"text\": \"Починить логин на проде.\"}",
                VoiceEnhanceMode.DICTATION, "починить логин на проде", MAPPER);

        assertThat(result).isNotNull();
        assertThat(result.isEnhanced()).isTrue();
        assertThat(result.getText()).isEqualTo("Починить логин на проде.");
    }

    @Test
    void taskDraftResponseCarriesTitleAndDescription() {
        VoiceEnhanceResponseDto result = DeepSeekVoiceEnhancementService.toResponse(
                "{\"title\": \"Исправить вход в систему\", "
                        + "\"description\": \"Починить логин на проде.\"}",
                VoiceEnhanceMode.TASK_DRAFT, "починить логин на проде", MAPPER);

        assertThat(result).isNotNull();
        assertThat(result.getTitle()).isEqualTo("Исправить вход в систему");
        assertThat(result.getDescription()).isEqualTo("Починить логин на проде.");
    }

    @Test
    void invalidJsonOrMissingFieldIsRejectedForRetry() {
        assertThat(DeepSeekVoiceEnhancementService.toResponse(
                "не json вовсе", VoiceEnhanceMode.DICTATION, "исходник", MAPPER)).isNull();
        assertThat(DeepSeekVoiceEnhancementService.toResponse(
                "{\"wrong\": \"поле\"}", VoiceEnhanceMode.DICTATION, "исходник", MAPPER)).isNull();
        assertThat(DeepSeekVoiceEnhancementService.toResponse(
                "{\"title\": \"есть\"}", VoiceEnhanceMode.TASK_DRAFT, "исходник", MAPPER)).isNull();
    }

    /** Ассистентский ответ вместо расшифровки короче исходника — это потеря текста. */
    @Test
    void dictationShorterThanHalfOfOriginalIsRejected() {
        String original = "нужно поправить фильтры на доске они сбрасываются при переходе";

        assertThat(DeepSeekVoiceEnhancementService.validDictation("Хорошо, понял.", original))
                .isNull();
        assertThat(DeepSeekVoiceEnhancementService.validDictation(
                "Нужно поправить фильтры на доске: они сбрасываются при переходе.", original))
                .isNotNull();
    }

    @Test
    void overlongDictationIsRejectedInsteadOfSilentlyClipped() {
        assertThat(DeepSeekVoiceEnhancementService.validDictation("я".repeat(6001), "исходник"))
                .isNull();
    }

    /** Пустое название — допустимый ответ «суть не ясна»: не выдумываем (ТП-212). */
    @Test
    void emptyTitleIsAcceptedAndOverlongTitleIsRejected() {
        assertThat(DeepSeekVoiceEnhancementService.validTitle("")).isEmpty();
        assertThat(DeepSeekVoiceEnhancementService.validTitle("я".repeat(141))).isNull();
        assertThat(DeepSeekVoiceEnhancementService.validTitle("Исправить логин"))
                .isEqualTo("Исправить логин");
    }

    @Test
    void sanitizeStripsWrappingQuotes() {
        assertThat(DeepSeekVoiceEnhancementService.sanitize("«Исправить баг»"))
                .isEqualTo("Исправить баг");
        assertThat(DeepSeekVoiceEnhancementService.sanitize("\"Добавить фильтр\""))
                .isEqualTo("Добавить фильтр");
        assertThat(DeepSeekVoiceEnhancementService.sanitize("  Обычный текст  "))
                .isEqualTo("Обычный текст");
    }
}
