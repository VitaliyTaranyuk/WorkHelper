package ru.worktechlab.work_task.config;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.LoggerContext;
import ch.qos.logback.classic.spi.LoggingEvent;
import org.junit.jupiter.api.Test;
import org.springframework.boot.logging.logback.StructuredLogEncoder;
import org.springframework.core.env.Environment;
import org.springframework.mock.env.MockEnvironment;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * T-301: проверка самого формата боевого лога.
 *
 * <p><b>Почему отдельным тестом.</b> Профиль {@code vds} не поднимается ни
 * одним прогоном: модульные тесты логируют текстом, интеграционные идут под
 * профилем {@code test}. Значит ошибка в описании appender'а (не то имя класса,
 * несуществующий формат) обнаружилась бы только на проде — причём отказом
 * старта, потому что logback валится при разборе конфигурации. Тест собирает
 * ровно тот encoder, который объявлен в {@code logback-spring.xml}, и смотрит
 * на его вывод.
 *
 * <p>Заодно закрывается утверждение, на которое опирается вся задача: поля MDC
 * ({@code rid}, {@code uid}, статус, длительность) действительно становятся
 * <b>полями JSON</b>, а не растворяются в тексте сообщения. Без этого
 * структурированный лог не отвечал бы на вопрос «покажи всё по запросу abc123».
 */
class StructuredLogFormatTest {

    private static final Path LOGBACK = Path.of("src/main/resources/logback-spring.xml");

    @Test
    void mdcFieldsBecomeSeparateJsonFields() {
        String json = encodeSampleAccessLine();

        assertThat(json)
                .as("без идентификатора запроса в отдельном поле строки одного запроса не собрать")
                .contains("\"rid\":\"abc123def456\"")
                .contains("\"uid\":\"9f1c-user-guid\"")
                .contains("\"status\":\"429\"")
                .contains("\"ms\":\"12\"");
    }

    /**
     * Имена полей ECS <b>вложенные</b>, а не точечные: {@code "log":{"level":…}},
     * а не {@code "log.level"}. Это не придирка к форматированию — шаг деплоя
     * ищет в логе прода признак структурированности грепом, и написанный «по
     * памяти» шаблон {@code ecs.version} не нашёлся бы никогда, объявив
     * работающий лог сломанным. Первый прогон этого теста ровно так и показал.
     */
    @Test
    void messageAndLevelKeepStandardEcsNames() {
        String json = encodeSampleAccessLine();

        assertThat(json)
                .contains("\"@timestamp\":")
                .contains("\"log\":{\"level\":\"INFO\"")
                .contains("\"message\":\"POST /work-task/api/v1/auth/login -> 429 за 12 мс\"")
                .contains("\"ecs\":{\"version\":");
    }

    /**
     * Имя сервиса задаётся {@code spring.application.name} в
     * {@code application.yml}: без него строки разных приложений на одном хосте
     * после агрегации неразличимы.
     */
    @Test
    void serviceNameComesFromApplicationName() {
        assertThat(encodeSampleAccessLine()).contains("\"service\":{\"name\":\"work-task\"");
    }

    /**
     * Признак, по которому шаг деплоя отличает структурированный лог от
     * текстового. Проверяется здесь, чтобы гейт и формат не разошлись молча:
     * поле {@code @timestamp} есть в каждой строке ECS и не встречается ни в
     * одном текстовом паттерне проекта.
     */
    @Test
    void deployGateMarkerIsPresentInEveryLine() {
        assertThat(encodeSampleAccessLine()).contains("@timestamp");
    }

    /**
     * Формат берётся ИЗ конфигурации, а не повторяется здесь константой: тест,
     * знающий формат по памяти, остался бы зелёным после подмены формата в
     * {@code logback-spring.xml} и проверял бы уже не то, что работает на проде.
     */
    private String configuredFormat() {
        String logback;
        try {
            assertThat(LOGBACK).as("тест запускается из каталога backend").exists();
            logback = Files.readString(LOGBACK, StandardCharsets.UTF_8);
        } catch (IOException e) {
            throw new AssertionError("не прочитать " + LOGBACK, e);
        }
        Matcher matcher = Pattern.compile("<format>(\\w+)</format>").matcher(logback);
        assertThat(matcher.find()).as("в logback-spring.xml не объявлен формат структурированного лога").isTrue();
        return matcher.group(1);
    }

    private String encodeSampleAccessLine() {
        LoggerContext context = new LoggerContext();
        // Тот же способ передачи окружения, что использует Spring Boot при
        // инициализации логирования: без него encoder не стартует.
        context.putObject(Environment.class.getName(),
                new MockEnvironment().withProperty("spring.application.name", "work-task"));

        StructuredLogEncoder encoder = new StructuredLogEncoder();
        encoder.setContext(context);
        encoder.setFormat(configuredFormat());
        encoder.setCharset(StandardCharsets.UTF_8);
        encoder.start();

        LoggingEvent event = new LoggingEvent(
                RequestLogFilter.class.getName(),
                context.getLogger(RequestLogFilter.class),
                Level.INFO,
                "POST /work-task/api/v1/auth/login -> 429 за 12 мс",
                null,
                null);
        event.setMDCPropertyMap(Map.of(
                RequestLogFilter.MDC_REQUEST_ID, "abc123def456",
                RequestLogFilter.MDC_USER_ID, "9f1c-user-guid",
                "status", "429",
                "ms", "12"));

        return new String(encoder.encode(event), StandardCharsets.UTF_8);
    }
}
