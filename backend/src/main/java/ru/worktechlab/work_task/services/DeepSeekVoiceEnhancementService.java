package ru.worktechlab.work_task.services;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import ru.worktechlab.work_task.dto.voice.VoiceEnhanceMode;
import ru.worktechlab.work_task.dto.voice.VoiceEnhanceResponseDto;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

/**
 * Улучшение текста голосового ввода через DeepSeek (ТП-208, chat completions,
 * OpenAI-совместимый формат — https://api-docs.deepseek.com/).
 *
 * Два режима: DICTATION — очистка распознанной речи (пунктуация, регистр,
 * слова-паразиты, без изменения смысла); TITLE — короткое название задачи
 * по тексту постановки (детерминированный движок generateTaskTitle на
 * фронтенде — единственный источник истины по алгоритму, LLM здесь только
 * переформулирует «своими словами», фронтенд подставляет локальный вариант
 * при любой ошибке).
 *
 * Деградация как в {@link GitHubDevPanelService}: пустой ключ или любая
 * ошибка сети/провайдера → честный фолбэк на исходный текст
 * (enhanced=false), исключение наружу не пробрасывается — голосовой ввод не
 * должен зависеть от доступности стороннего API.
 */
@Service
@Slf4j
public class DeepSeekVoiceEnhancementService {

    private static final String DICTATION_SYSTEM_PROMPT =
            "Ты помогаешь очистить текст, распознанный из речи пользователя на "
                    + "русском языке. Верни ТОЛЬКО исправленный текст: расставь знаки "
                    + "препинания и заглавные буквы, убери слова-паразиты и явные "
                    + "повторы, исправь очевидные ошибки распознавания речи. НЕ "
                    + "добавляй новую информацию и не меняй смысл, не отвечай на текст "
                    + "как ассистент, не добавляй пояснений и кавычек — верни только "
                    + "сам текст.";

    private static final String TITLE_SYSTEM_PROMPT =
            "Ты помогаешь сформулировать короткое (до 70 символов) название задачи "
                    + "в трекере на русском языке по тексту её постановки. Верни ТОЛЬКО "
                    + "название: без кавычек, без точки в конце, начни с глагола в "
                    + "повелительном наклонении в инфинитиве (например «Исправить», "
                    + "«Добавить», «Настроить»), без пояснений.";

    private static final int MAX_DICTATION_LENGTH = 4000;
    private static final int MAX_TITLE_LENGTH = 200;

    @Value("${app.deepseek.api-key:}")
    private String apiKey;

    @Value("${app.deepseek.base-url:https://api.deepseek.com}")
    private String baseUrl;

    @Value("${app.deepseek.model:deepseek-v4-flash}")
    private String model;

    private final HttpClient http = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5))
            .followRedirects(HttpClient.Redirect.NORMAL)
            .build();
    private final ObjectMapper objectMapper = new ObjectMapper();

    public VoiceEnhanceResponseDto enhance(String text, VoiceEnhanceMode mode) {
        if (apiKey == null || apiKey.isBlank() || text == null || text.isBlank()) {
            return VoiceEnhanceResponseDto.fallback(text);
        }
        try {
            String systemPrompt = systemPromptFor(mode);
            String requestBody = buildRequestBody(model, systemPrompt, text);
            HttpRequest request = HttpRequest.newBuilder(URI.create(baseUrl + "/chat/completions"))
                    .header("Content-Type", "application/json")
                    .header("Authorization", "Bearer " + apiKey)
                    .timeout(Duration.ofSeconds(15))
                    .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                    .build();
            HttpResponse<String> response = http.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() != 200) {
                log.warn("DeepSeek: HTTP {} при улучшении текста ({})", response.statusCode(), mode);
                return VoiceEnhanceResponseDto.fallback(text);
            }
            String content = parseContent(response.body(), objectMapper);
            String sanitized = sanitize(content, mode);
            if (sanitized.isBlank()) return VoiceEnhanceResponseDto.fallback(text);
            return new VoiceEnhanceResponseDto(sanitized, true);
        } catch (Exception e) {
            log.warn("DeepSeek недоступен при улучшении текста ({}): {}", mode, e.getMessage());
            return VoiceEnhanceResponseDto.fallback(text);
        }
    }

    static String systemPromptFor(VoiceEnhanceMode mode) {
        return mode == VoiceEnhanceMode.TITLE ? TITLE_SYSTEM_PROMPT : DICTATION_SYSTEM_PROMPT;
    }

    /** Пакетно-приватная (не static ObjectMapper) сборка JSON-тела запроса — тестируется без сети. */
    static String buildRequestBody(String model, String systemPrompt, String text) {
        ObjectMapper mapper = new ObjectMapper();
        ObjectNode root = mapper.createObjectNode();
        root.put("model", model);
        root.put("temperature", 0.3);
        root.put("max_tokens", 300);
        var messages = root.putArray("messages");
        var system = messages.addObject();
        system.put("role", "system");
        system.put("content", systemPrompt);
        var user = messages.addObject();
        user.put("role", "user");
        user.put("content", text);
        return root.toString();
    }

    /** Разбор ответа DeepSeek (choices[0].message.content) — тестируется без сети. */
    static String parseContent(String responseBody, ObjectMapper mapper) throws Exception {
        JsonNode root = mapper.readTree(responseBody);
        JsonNode content = root.path("choices").path(0).path("message").path("content");
        if (content.isMissingNode() || content.isNull()) {
            throw new IllegalStateException("DeepSeek: пустой content в ответе");
        }
        return content.asText();
    }

    /** Обрезка кавычек LLM и защита от неограниченной длины (провайдеру не доверяем слепо). */
    static String sanitize(String content, VoiceEnhanceMode mode) {
        String trimmed = content.trim();
        if (trimmed.length() >= 2
                && ((trimmed.startsWith("\"") && trimmed.endsWith("\""))
                    || (trimmed.startsWith("«") && trimmed.endsWith("»")))) {
            trimmed = trimmed.substring(1, trimmed.length() - 1).trim();
        }
        int max = mode == VoiceEnhanceMode.TITLE ? MAX_TITLE_LENGTH : MAX_DICTATION_LENGTH;
        return trimmed.length() > max ? trimmed.substring(0, max).trim() : trimmed;
    }
}
