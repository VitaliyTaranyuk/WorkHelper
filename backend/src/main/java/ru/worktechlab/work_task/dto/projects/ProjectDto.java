package ru.worktechlab.work_task.dto.projects;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import ru.worktechlab.work_task.dto.statuses.TaskStatusDto;
import ru.worktechlab.work_task.dto.users.UserShortDataDto;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@NoArgsConstructor
@Getter
@Setter
public class ProjectDto {
    @NotNull
    @Schema(description = "ИД проекта")
    private String id;
    @NotNull
    @Schema(description = "Название проекта")
    private String name;
    @NotNull
    @Schema(description = "Владелец проекта")
    private UserShortDataDto owner;
    @NotNull
    @Schema(description = "Дата создания проекта")
    private LocalDate creationDate;
    @Schema(description = "Дата закрытия проекта")
    private LocalDate finishDate;
    @NotNull
    @Schema(description = "Дата начала проекта")
    private LocalDate startDate;
    @Schema(description = "Дата обновления проекта")
    private LocalDate updateDate;
    @Schema(description = "Комментарий к проекту")
    private String description;
    @NotNull
    @Schema(description = "Статус проекта")
    private String projectStatus;
    @NotNull
    @Schema(description = "Создатель проекта")
    private UserShortDataDto creator;
    @Schema(description = "Пользователь, закрывший проект")
    private UserShortDataDto finisher;
    @NotNull
    @Schema(description = "Код проекта")
    private String code;
    /**
     * T-519: режим доски. Отдаётся строкой и **никогда не пустой** — незаполненное поле
     * проекта превращается в {@code SPRINT} здесь, а не в каждом потребителе. Строка, а не
     * enum: перечисление расширяется аддитивно, и фронтенд обязан деградировать к
     * безопасному поведению на незнакомом значении (**W-08**).
     */
    @Schema(description = "Режим доски: SPRINT или KANBAN", example = "SPRINT")
    private String boardMode;
    @Schema(description = "Статусы проекта")
    private List<TaskStatusDto> statuses = new ArrayList<>();
    @Schema(description = "Пользователи проекта")
    private List<UserShortDataDto> users = new ArrayList<>();
}
