package ru.worktechlab.work_task.dto.monitoring;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Вебхук алерта мониторинга клиентских ошибок (ТП-175). Формат — general
 * webhook GlitchTip (Slack-совместимый: text + attachments); неизвестные
 * поля игнорируются, чтобы обновления GlitchTip не ломали приём.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class MonitoringWebhookDto {

    /** Источник алерта (например, "GlitchTip"). */
    private String alias;

    /** Общий текст алерта («N events», правило и т.п.). */
    private String text;

    private List<Attachment> attachments;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Attachment {
        /** Заголовок issue (тип и сообщение ошибки). */
        private String title;

        /** Ссылка на карточку issue в UI мониторинга. */
        @com.fasterxml.jackson.annotation.JsonProperty("title_link")
        private String titleLink;

        /** Краткое описание (culprit/путь). */
        private String text;
    }
}
