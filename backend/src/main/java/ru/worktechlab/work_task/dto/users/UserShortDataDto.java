package ru.worktechlab.work_task.dto.users;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@NoArgsConstructor
@Getter
@Setter
public class UserShortDataDto {
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
}
