package ru.worktechlab.work_task.exceptions;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import com.fasterxml.jackson.databind.exc.InvalidFormatException;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.mock.http.MockHttpInputMessage;

import java.io.ByteArrayInputStream;
import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

class GlobalExceptionHandlerTest {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

    private ListAppender<ILoggingEvent> appender;
    private Logger handlerLogger;

    @BeforeEach
    void captureLog() {
        handlerLogger = (Logger) LoggerFactory.getLogger(GlobalExceptionHandler.class);
        handlerLogger.setLevel(Level.INFO);
        appender = new ListAppender<>();
        appender.start();
        handlerLogger.addAppender(appender);
    }

    @AfterEach
    void releaseLog() {
        handlerLogger.detachAppender(appender);
    }

    private HttpMessageNotReadableException notReadable(Throwable cause) {
        return new HttpMessageNotReadableException(
                "JSON parse error",
                cause,
                new MockHttpInputMessage(new ByteArrayInputStream(new byte[0]))
        );
    }

    /**
     * ТП-145: если Jackson знает поле, на котором сломался разбор, — имя поля
     * попадает в сообщение (и только оно: без классов/значений).
     */
    @Test
    void messageNotReadable_shouldNameField_whenJacksonKnowsPath() {
        InvalidFormatException cause = InvalidFormatException.from(
                null, "Cannot deserialize value", "не-дата", LocalDateTime.class);
        cause.prependPath(Object.class, "startAt");

        ResponseEntity<String> response = handler.handleMessageNotReadable(notReadable(cause));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody())
                .isEqualTo("Некорректный формат запроса: проверьте поле «startAt»");
        // внутренности Jackson наружу не утекают
        assertThat(response.getBody()).doesNotContain("Cannot deserialize", "LocalDateTime");
    }

    @Test
    void messageNotReadable_shouldFallBackToGenericMessage_withoutPath() {
        ResponseEntity<String> response =
                handler.handleMessageNotReadable(notReadable(new RuntimeException("boom")));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).isEqualTo("Некорректный формат запроса");
    }

    /**
     * T-301: до этой задачи общий обработчик был единственным, который не писал
     * в лог ничего — пользователь получал 500, а на сервере не оставалось
     * следа. Spring считает исключение обработанным и сам его не логирует, то
     * есть самый интересный класс отказов был невидим целиком (W-06).
     */
    @Test
    void unexpectedError_shouldBeLoggedWithStackTrace() {
        ResponseEntity<String> response =
                handler.handleRuntimeException(new IllegalStateException("сломалось внутри"));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR);
        assertThat(appender.list)
                .as("500 без записи в логе неотличима от «ничего не происходило»")
                .hasSize(1);
        assertThat(appender.list.get(0).getLevel()).isEqualTo(Level.ERROR);
        assertThat(appender.list.get(0).getThrowableProxy())
                .as("без стектрейса у NPE вообще нет сообщения — запись была бы бесполезной")
                .isNotNull();
    }

    /**
     * Отдельный случай именно потому, что он самый частый и самый неудобный:
     * у NPE {@code getMessage()} часто null, и запись «Необработанное
     * исключение: null» не помогла бы ничем.
     */
    @Test
    void unexpectedError_shouldNameExceptionType_whenMessageIsAbsent() {
        handler.handleRuntimeException(new NullPointerException());

        assertThat(appender.list.get(0).getFormattedMessage())
                .contains(NullPointerException.class.getName());
    }
}
