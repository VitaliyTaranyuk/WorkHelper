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
    // 2-32: usernames, сгенерированные из префикса email (например "vt"),
    // бывают двухсимвольными — политика и regex упоминаний должны совпадать
    @Pattern(regexp = "^[a-z0-9_]{2,32}$", message = "Username: 2-32 символа, строчная латиница, цифры, _")
    @Size(max = 32)
    private String username;
}
