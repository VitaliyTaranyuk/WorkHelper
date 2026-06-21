package ru.worktechlab.work_task.dto.projects;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import ru.worktechlab.work_task.dto.tasks.TaskDataDto;

import java.util.List;

@NoArgsConstructor
@Getter
@Setter
public class UserWithTasksDto {
    @NotNull
    @Schema(description = "ИД пользователя")
    private String id;
    @NotNull
    @Schema(description = "Email пользователя")
    private String email;
    @NotNull
    @Schema(description = "Имя пользователя")
    private String firstName;
    @Schema(description = "Фамилия пользователя")
    private String lastName;
    @NotNull
    @Schema(description = "Пол пользователя")
    private String gender;
    @Schema(description = "Список задач")
    private List<TaskDataDto> tasks;

    public UserWithTasksDto(String id,
                            String email,
                            String firstName,
                            String lastName,
                            String gender,
                            List<TaskDataDto> tasks) {
        this.id = id;
        this.email = email;
        this.firstName = firstName;
        this.lastName = lastName;
        this.gender = gender;
        this.tasks = tasks;
    }
}
