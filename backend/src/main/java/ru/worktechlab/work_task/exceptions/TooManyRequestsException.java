package ru.worktechlab.work_task.exceptions;

import lombok.Getter;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/**
 * T-302: превышен лимит запросов.
 *
 * Наследуется от {@link RuntimeException} осознанно: перебор пароля не является
 * ожидаемым результатом бизнес-операции, и обязывать каждый вызывающий метод
 * объявлять это в {@code throws} значило бы разносить защиту по подписям.
 *
 * {@code retryAfterSeconds} нужен не для красоты: без {@code Retry-After}
 * клиент не знает, когда повторять, и либо бросает попытки, либо долбит в
 * заблокированный эндпоинт (**K-34** — наружу должно идти понятное указание).
 */
@Getter
@ResponseStatus(HttpStatus.TOO_MANY_REQUESTS)
public class TooManyRequestsException extends RuntimeException {
    static final long serialVersionUID = 1L;

    private final long retryAfterSeconds;

    public TooManyRequestsException(String message, long retryAfterSeconds) {
        super(message);
        this.retryAfterSeconds = retryAfterSeconds;
    }
}
