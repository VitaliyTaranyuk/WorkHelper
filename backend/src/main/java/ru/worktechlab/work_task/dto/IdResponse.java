package ru.worktechlab.work_task.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * Ответ-обёртка для идентификатора. Контракт фронтенда (сгенерированные
 * OpenAPI-типы) ожидает объект {"id": "..."} — возврат «голой» строки
 * ломает клиентский код вида response.data.id.
 */
@Getter
@NoArgsConstructor
@AllArgsConstructor
public class IdResponse {

    @Schema(description = "ИД", example = "656c989e-ceb1-4a9f-a6a9-9ab40cc11540")
    private String id;
}
