package ru.worktechlab.work_task.dto;

import com.fasterxml.jackson.annotation.JsonIgnore;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;

/**
 * Ответ проверки работоспособности (TD-029). Наружу отдаётся только состояние
 * компонентов — ни SQL, ни имён хостов, ни stacktrace (K-34): причина падения
 * пишется в лог приложения.
 */
@Getter
public class HealthResponseDto {

    public static final String UP = "UP";
    public static final String DOWN = "DOWN";

    @Schema(description = "Состояние приложения целиком", example = UP)
    private final String status;

    @Schema(description = "Состояние подключения к базе данных", example = UP)
    private final String database;

    private HealthResponseDto(String status, String database) {
        this.status = status;
        this.database = database;
    }

    /**
     * Единственная зависимость, без которой приложение не работает, — база
     * данных, поэтому общий статус пока совпадает с её состоянием. Появится
     * второй обязательный компонент — {@code status} станет агрегатом.
     */
    public static HealthResponseDto ofDatabase(boolean databaseReachable) {
        String database = databaseReachable ? UP : DOWN;
        return new HealthResponseDto(database, database);
    }

    /** Не сериализуется: в теле ответа состояние уже выражено полем {@code status}. */
    @JsonIgnore
    public boolean isUp() {
        return UP.equals(status);
    }
}
