package ru.worktechlab.work_task.dto.meet;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Клиентская метрика качества соединения (.ai/MEET_ARCHITECTURE.md §7):
 * агрегируется в логах backend — доля успешных установок, ICE-фейлы,
 * частота переподключений. Без внешних систем наблюдаемости.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class MeetStatsRequest {

    @Schema(description = "Событие: connected | ice-failed | reconnected | media-denied")
    @NotBlank(message = "Не задано событие")
    @Size(max = 32, message = "Событие не должно превышать 32 символа")
    private String event;

    @Schema(description = "Время установления соединения, мс")
    private Long setupMs;

    @Schema(description = "Число участников в момент события")
    private Integer peers;

    @Schema(description = "Краткая техническая деталь (код ошибки и т.п.)")
    @Size(max = 255, message = "Деталь не должна превышать 255 символов")
    private String detail;
}
