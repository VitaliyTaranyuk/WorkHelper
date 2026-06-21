package ru.worktechlab.work_task.dto.users;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Schema(description = "Минимальное редактирование профиля")
@Getter
@Setter
@NoArgsConstructor
public class UpdateProfileRequest {

    @Schema(description = "Имя пользователя", example = "Иван")
    @NotBlank(message = "Имя не может быть пустым")
    private String firstName;

    @Schema(description = "Отображаемое имя", example = "Иван Иванов")
    private String displayName;

    @Schema(description = "Username (уникальный, латиница/цифры/_)", example = "ivanov")
    @Pattern(regexp = "^[a-z0-9_]{3,32}$", message = "Username: 3-32 символа, строчная латиница, цифры, _")
    @Size(max = 32)
    private String username;
}
