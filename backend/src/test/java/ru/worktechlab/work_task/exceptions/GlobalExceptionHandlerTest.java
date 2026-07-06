package ru.worktechlab.work_task.exceptions;

import com.fasterxml.jackson.databind.exc.InvalidFormatException;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.mock.http.MockHttpInputMessage;

import java.io.ByteArrayInputStream;
import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

class GlobalExceptionHandlerTest {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

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
}
