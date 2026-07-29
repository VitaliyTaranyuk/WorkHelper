package ru.worktechlab.work_task.dto.users;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Getter;

/**
 * Найденный по точному username/email пользователь для приглашения в проект
 * (TD-028). Отдельный DTO от {@link UserPickerDto} именно из-за состава полей:
 * email здесь не возвращается — приглашающий его и так ввёл, а отдавать его в
 * ответе значило бы раздавать ПДн тому, кто просто перебирает строки (K-36).
 */
@Getter
@AllArgsConstructor
@Schema(description = "Пользователь, найденный по точному username или email")
public class UserLookupDto {

    @Schema(description = "ИД пользователя")
    private final String id;

    @Schema(description = "Имя")
    private final String firstName;

    @Schema(description = "Фамилия")
    private final String lastName;

    @Schema(description = "Отображаемое имя")
    private final String displayName;

    @Schema(description = "Username для @упоминаний")
    private final String username;
}
