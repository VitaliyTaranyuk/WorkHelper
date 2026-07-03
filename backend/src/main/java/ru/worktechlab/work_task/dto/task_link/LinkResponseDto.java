package ru.worktechlab.work_task.dto.task_link;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Getter;
import lombok.Setter;

@JsonInclude(JsonInclude.Include.NON_NULL)
@Getter
@Setter
public class LinkResponseDto {
    private String linkId;
    private String source;
    private String target;
    private String name;
    private String description;
    // Код/название сторон связи — фронтенд рисует связь гиперссылкой
    // на /task/{code} (ТП-38), по одним UUID ссылку не построить.
    private String sourceCode;
    private String sourceTitle;
    private String targetCode;
    private String targetTitle;

    public LinkResponseDto(String linkId) {
        this.linkId = linkId;
    }

    public LinkResponseDto(String linkId, String source, String target, String name, String description) {
        this.linkId = linkId;
        this.source = source;
        this.target = target;
        this.name = name;
        this.description = description;
    }
}
