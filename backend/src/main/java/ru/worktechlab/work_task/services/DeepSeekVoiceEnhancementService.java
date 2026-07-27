package ru.worktechlab.work_task.services;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import ru.worktechlab.work_task.dto.voice.VoiceEnhanceMode;
import ru.worktechlab.work_task.dto.voice.VoiceEnhanceResponseDto;
import ru.worktechlab.work_task.utils.UserContext;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

/**
 * Улучшение текста голосового ввода через DeepSeek (ТП-208, доработка ТП-212;
 * chat completions, OpenAI-совместимый формат — https://api-docs.deepseek.com/).
 *
 * Три режима: DICTATION — очистка распознанной речи; TITLE — название задачи по
 * тексту постановки; TASK_DRAFT — название и описание одним вызовом (голосовое
 * создание задачи). Детерминированные движки фронтенда (TextFormatter,
 * generateTaskTitle) остаются мгновенным базовым результатом и фолбэком.
 *
 * ТП-212, инварианты (в порядке важности):
 *  1. Надиктованное НЕ теряется. Ответ принимается, только если он полный
 *     (finish_reason != "length") и проходит схему; иначе — фолбэк на присланный
 *     текст. Обрезанный ответ провайдера — самый опасный случай: он выглядит
 *     валидным, поэтому проверяется до разбора.
 *  2. Ответ — строгий JSON ({@code response_format: json_object}); при
 *     невалидном JSON/схеме делается ОДИН повтор, затем фолбэк.
 *  3. {@code max_tokens} считается от длины входа — фиксированные 300 токенов
 *     (ТП-208) обрезали длинные диктовки.
 *
 * Деградация как в {@link GitHubDevPanelService}: пустой ключ или любая ошибка
 * сети/провайдера → честный фолбэк (enhanced=false), исключение наружу не
 * пробрасывается — голосовой ввод не должен зависеть от стороннего API.
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class DeepSeekVoiceEnhancementService {

    /**
     * Общая для всех режимов часть промпта. Слово «json» и пример формата
     * обязательны при {@code response_format: json_object} — без них модель
     * может выдавать пустой поток до упора в лимит токенов (док DeepSeek).
     */
    private static final String JSON_CONTRACT =
            " Ответ верни строго в формате json, без пояснений и без markdown-обёртки.";

    private static final String DICTATION_SYSTEM_PROMPT =
            "Ты — редактор расшифровок русской речи в трекере задач: на вход приходит "
                    + "текст, распознанный с микрофона. Верни тот же текст в читаемом виде. "
                    + "Правила: расставь знаки препинания и заглавные буквы, раздели на "
                    + "абзацы, перечисления оформи списком (каждый пункт с новой строки, "
                    + "начиная с «- »); убери слова-паразиты и повторы; убери самоисправления, "
                    + "оставив только исправленный вариант (например «сделать во вторник, нет, "
                    + "в среду» → «сделать в среду»); исправь очевидные ошибки распознавания. "
                    + "Технические термины, названия, идентификаторы, пути к файлам, номера "
                    + "тикетов (например ТП-212), команды и код перенеси ДОСЛОВНО — не переводи, "
                    + "не склоняй и не исправляй их. НЕ добавляй ничего от себя, не отвечай на "
                    + "текст как ассистент, не сокращай и не пересказывай: все факты автора "
                    + "должны остаться на месте."
                    + JSON_CONTRACT
                    + " Пример: {\"text\": \"готовый текст\"}";

    private static final String TITLE_SYSTEM_PROMPT =
            "Ты формулируешь название задачи в трекере на русском языке по тексту её "
                    + "постановки. Правила: длина 40–100 символов; форма «<действие> <объект> "
                    + "<контекст>», начни с глагола в инфинитиве (например «Исправить», "
                    + "«Добавить», «Настроить»); без кавычек и без точки в конце; названия "
                    + "модулей, идентификаторы и номера тикетов переноси дословно. Ничего не "
                    + "выдумывай: если текст слишком короткий, бессмысленный или суть работы из "
                    + "него не ясна — верни пустую строку."
                    + JSON_CONTRACT
                    + " Пример: {\"title\": \"Исправить сохранение вложений в карточке задачи\"}";

    private static final String TASK_DRAFT_SYSTEM_PROMPT =
            "Ты превращаешь надиктованную голосом постановку в карточку задачи трекера "
                    + "на русском языке. Поле description: тот же текст в читаемом виде — знаки "
                    + "препинания, заглавные буквы, абзацы, перечисления списком (каждый пункт с "
                    + "новой строки, начиная с «- »); без слов-паразитов, повторов и "
                    + "самоисправлений (оставляй только исправленный вариант); ничего не "
                    + "добавляй от себя, не сокращай и не пересказывай. Поле title: название "
                    + "длиной 40–100 символов в форме «<действие> <объект> <контекст>», с глагола "
                    + "в инфинитиве, без кавычек и точки в конце; если суть работы не ясна — "
                    + "пустая строка. И там и там технические термины, идентификаторы, пути и "
                    + "номера тикетов переноси дословно."
                    + JSON_CONTRACT
                    + " Пример: {\"title\": \"Исправить сохранение вложений\", "
                    + "\"description\": \"При загрузке файла больше 10 МБ карточка падает.\"}";

    /** Соответствует @Size у VoiceEnhanceRequestDto — контракт входа. */
    private static final int MAX_DICTATION_LENGTH = 4000;

    /**
     * Потолок ВЫХОДА диктовки: пунктуация и абзацы делают результат чуть длиннее
     * входа, поэтому лимит входа здесь не годится. Ответ длиннее потолка —
     * признак, что модель дописала своё: он отклоняется целиком (фолбэк), а не
     * обрезается, — обрезка молча потеряла бы конец текста пользователя.
     */
    private static final int MAX_DICTATION_OUTPUT_LENGTH = 6000;

    /**
     * Промпт просит 40–100 символов; потолок с запасом. Более длинное название —
     * невыполненная инструкция: отклоняем, чтобы уйти на повтор и затем на
     * детерминированный generateTaskTitle, а не показывать простыню в поле.
     */
    private static final int MAX_TITLE_LENGTH = 140;

    /** Диктовка не пересказывается: результат короче половины исходника — потеря смысла. */
    private static final double MIN_DICTATION_LENGTH_RATIO = 0.5;

    /**
     * Потолок вывода. Щедрый сознательно: {@code max_tokens} — это верхняя
     * граница, платим по факту, поэтому запас ничего не стоит, а его нехватка
     * стоит дорого — обрезанный ответ уходит в фолбэк, и улучшения не будет.
     * Проверено на проде (ТП-212): при 4096/160 обрезались и длинная диктовка,
     * и короткое название — модель расходует часть лимита на рассуждения,
     * поэтому «по длине ответа» лимит считать нельзя.
     */
    private static final int MAX_OUTPUT_TOKENS = 16000;
    private static final int TITLE_OUTPUT_TOKENS = 1500;

    /** Одна попытка + один повтор при невалидном ответе (требование ТП-212). */
    private static final int MAX_ATTEMPTS = 2;

    private final UserContext userContext;
    private final VoiceEnhancementMetrics metrics;
    private final VoiceEnhancementRateLimiter rateLimiter;

    @Value("${app.deepseek.api-key:}")
    private String apiKey;

    @Value("${app.deepseek.base-url:https://api.deepseek.com}")
    private String baseUrl;

    @Value("${app.deepseek.model:deepseek-v4-flash}")
    private String model;

    @Value("${app.deepseek.request-timeout-seconds:20}")
    private int requestTimeoutSeconds;

    private final HttpClient http = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5))
            .followRedirects(HttpClient.Redirect.NORMAL)
            .build();
    private final ObjectMapper objectMapper = new ObjectMapper();

    public VoiceEnhanceResponseDto enhance(String text, VoiceEnhanceMode mode) {
        if (apiKey == null || apiKey.isBlank() || text == null || text.isBlank()) {
            return VoiceEnhanceResponseDto.fallback(text);
        }
        if (!rateLimiter.tryAcquire(currentUserId())) {
            metrics.recordRateLimited();
            log.warn("DeepSeek: превышен часовой лимит улучшений текста, отдан исходный текст");
            return VoiceEnhanceResponseDto.fallback(text);
        }

        long startedAt = System.currentTimeMillis();
        for (int attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
            Attempt result = callOnce(text, mode);
            if (result.response() != null) {
                metrics.recordSuccess(mode, System.currentTimeMillis() - startedAt,
                        result.promptTokens(), result.completionTokens());
                return result.response();
            }
            if (!result.retryable() || attempt == MAX_ATTEMPTS) break;
            metrics.recordRetry();
            log.warn("DeepSeek: невалидный ответ ({}), повтор запроса", result.failure());
        }
        metrics.recordFallback(mode, System.currentTimeMillis() - startedAt);
        return VoiceEnhanceResponseDto.fallback(text);
    }

    /**
     * Одна попытка. {@code response == null} — неуспех; {@code retryable} —
     * имеет ли смысл повтор (невалидный JSON/схема — да; обрезка по лимиту
     * токенов, HTTP-ошибка или сбой сети — нет, повтор даст то же самое).
     */
    private record Attempt(VoiceEnhanceResponseDto response, boolean retryable, String failure,
                           long promptTokens, long completionTokens) {
        static Attempt ok(VoiceEnhanceResponseDto response, long prompt, long completion) {
            return new Attempt(response, false, null, prompt, completion);
        }

        static Attempt invalid(String failure) {
            return new Attempt(null, true, failure, 0, 0);
        }

        static Attempt failed(String failure) {
            return new Attempt(null, false, failure, 0, 0);
        }
    }

    private Attempt callOnce(String text, VoiceEnhanceMode mode) {
        try {
            String requestBody = buildRequestBody(model, systemPromptFor(mode), text,
                    maxTokensFor(mode, text));
            HttpRequest request = HttpRequest.newBuilder(URI.create(baseUrl + "/chat/completions"))
                    .header("Content-Type", "application/json")
                    .header("Authorization", "Bearer " + apiKey)
                    .timeout(Duration.ofSeconds(requestTimeoutSeconds))
                    .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                    .build();
            HttpResponse<String> response = http.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() != 200) {
                log.warn("DeepSeek: HTTP {} при улучшении текста ({})", response.statusCode(), mode);
                return Attempt.failed("HTTP " + response.statusCode());
            }

            JsonNode root = objectMapper.readTree(response.body());
            // Обрезанный ответ выглядит валидным — проверяем ДО разбора содержимого,
            // иначе пользователь молча получит урезанный текст вместо своего.
            if (isTruncated(root)) {
                metrics.recordTruncation();
                log.warn("DeepSeek: ответ обрезан по лимиту токенов ({}), фолбэк на исходный текст", mode);
                return Attempt.failed("finish_reason=length");
            }

            String content = parseContent(root);
            VoiceEnhanceResponseDto parsed = toResponse(content, mode, text, objectMapper);
            if (parsed == null) return Attempt.invalid("ответ не соответствует схеме " + mode);

            JsonNode usage = root.path("usage");
            return Attempt.ok(parsed,
                    usage.path("prompt_tokens").asLong(0),
                    usage.path("completion_tokens").asLong(0));
        } catch (Exception e) {
            log.warn("DeepSeek недоступен при улучшении текста ({}): {}", mode, e.getMessage());
            return Attempt.failed(e.getClass().getSimpleName());
        }
    }

    private String currentUserId() {
        try {
            return userContext.getUserData().getUserId();
        } catch (RuntimeException e) {
            // Контекст пользователя не инициализирован (например вызов вне
            // HTTP-потока) — лимит считаем общим, а не падаем.
            return "anonymous";
        }
    }

    static String systemPromptFor(VoiceEnhanceMode mode) {
        return switch (mode) {
            case TITLE -> TITLE_SYSTEM_PROMPT;
            case TASK_DRAFT -> TASK_DRAFT_SYSTEM_PROMPT;
            case DICTATION -> DICTATION_SYSTEM_PROMPT;
        };
    }

    /**
     * Лимит вывода от длины входа: текст возвращается целиком, поэтому вывод не
     * короче входа. Считаем ~1 токен на символ кириллицы (пессимистично) плюс
     * фиксированный запас на рассуждения модели и JSON-обёртку. Фиксированные
     * 300 токенов (ТП-208) резали длинные диктовки.
     */
    static int maxTokensFor(VoiceEnhanceMode mode, String text) {
        if (mode == VoiceEnhanceMode.TITLE) return TITLE_OUTPUT_TOKENS;
        return Math.min(text.length() + 2000, MAX_OUTPUT_TOKENS);
    }

    /** Сборка JSON-тела запроса — тестируется без сети. */
    static String buildRequestBody(String model, String systemPrompt, String text, int maxTokens) {
        ObjectMapper mapper = new ObjectMapper();
        ObjectNode root = mapper.createObjectNode();
        root.put("model", model);
        root.put("temperature", 0.3);
        root.put("max_tokens", maxTokens);
        root.putObject("response_format").put("type", "json_object");
        var messages = root.putArray("messages");
        var system = messages.addObject();
        system.put("role", "system");
        system.put("content", systemPrompt);
        var user = messages.addObject();
        user.put("role", "user");
        user.put("content", text);
        return root.toString();
    }

    /** Признак обрезки ответа по лимиту токенов (док DeepSeek: finish_reason=length). */
    static boolean isTruncated(JsonNode root) {
        return "length".equals(root.path("choices").path(0).path("finish_reason").asText(""));
    }

    /** Разбор ответа DeepSeek (choices[0].message.content) — тестируется без сети. */
    static String parseContent(JsonNode root) {
        JsonNode content = root.path("choices").path(0).path("message").path("content");
        if (content.isMissingNode() || content.isNull()) {
            throw new IllegalStateException("DeepSeek: пустой content в ответе");
        }
        return content.asText();
    }

    /**
     * Валидация ответа по схеме режима. {@code null} — схема не выполнена
     * (нужен повтор). Пустой title для TITLE/TASK_DRAFT — ДОПУСТИМЫЙ ответ
     * «суть не ясна»: по требованию ТП-212 название не выдумывается, поле
     * остаётся пустым.
     *
     * {@code original} нужен для проверки сохранности диктовки: модель не должна
     * сокращать или пересказывать сказанное.
     */
    static VoiceEnhanceResponseDto toResponse(String content, VoiceEnhanceMode mode,
                                              String original, ObjectMapper mapper) {
        JsonNode json;
        try {
            json = mapper.readTree(stripCodeFence(content));
        } catch (Exception e) {
            return null;
        }
        if (json == null || !json.isObject()) return null;

        return switch (mode) {
            case DICTATION -> {
                String text = validDictation(requiredText(json, "text"), original);
                yield text == null ? null : VoiceEnhanceResponseDto.enhanced(text);
            }
            case TITLE -> {
                String title = validTitle(requiredText(json, "title"));
                yield title == null ? null : VoiceEnhanceResponseDto.enhanced(title);
            }
            case TASK_DRAFT -> {
                String title = validTitle(requiredText(json, "title"));
                String description = validDictation(requiredText(json, "description"), original);
                yield title == null || description == null
                        ? null
                        : VoiceEnhanceResponseDto.draft(title, description);
            }
        };
    }

    /**
     * Диктовка: непустая, не длиннее потолка вывода и не короче половины
     * исходника. {@code null} — ответ непригоден.
     */
    static String validDictation(String value, String original) {
        if (value == null) return null;
        String text = sanitize(value);
        if (text.isBlank() || text.length() > MAX_DICTATION_OUTPUT_LENGTH) return null;
        int minLength = (int) ((original == null ? 0 : original.length()) * MIN_DICTATION_LENGTH_RATIO);
        return text.length() < minLength ? null : text;
    }

    /**
     * Название: пустое допустимо (суть не ясна — поле останется пустым),
     * слишком длинное — нет. {@code null} — ответ непригоден.
     */
    static String validTitle(String value) {
        if (value == null) return null;
        String title = sanitize(value);
        return title.length() > MAX_TITLE_LENGTH ? null : title;
    }

    /**
     * Снятие markdown-обёртки вокруг JSON. Промпт и {@code response_format}
     * требуют голый JSON, но модель периодически возвращает его в ```-блоке —
     * на проде это давало «ответ не соответствует схеме» и лишний повтор
     * (ТП-212). Дешевле принять оба варианта, чем терять улучшение.
     */
    static String stripCodeFence(String content) {
        String trimmed = content.trim();
        if (!trimmed.startsWith("```")) return trimmed;
        int firstLineEnd = trimmed.indexOf('\n');
        if (firstLineEnd < 0) return trimmed;
        String body = trimmed.substring(firstLineEnd + 1);
        int closing = body.lastIndexOf("```");
        return (closing < 0 ? body : body.substring(0, closing)).trim();
    }

    /** Значение обязательного строкового поля; {@code null} — поля нет или это не строка. */
    private static String requiredText(JsonNode json, String field) {
        JsonNode node = json.path(field);
        return node.isTextual() ? node.asText() : null;
    }

    /** Снятие кавычек, которыми LLM иногда оборачивает ответ. */
    static String sanitize(String content) {
        String trimmed = content.trim();
        if (trimmed.length() >= 2
                && ((trimmed.startsWith("\"") && trimmed.endsWith("\""))
                    || (trimmed.startsWith("«") && trimmed.endsWith("»")))) {
            trimmed = trimmed.substring(1, trimmed.length() - 1).trim();
        }
        return trimmed;
    }
}
