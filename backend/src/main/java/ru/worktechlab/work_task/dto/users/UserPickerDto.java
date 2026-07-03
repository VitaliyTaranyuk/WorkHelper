package ru.worktechlab.work_task.dto.users;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Пользователь в формате для picker'ов (assignee / @mention / комментарии).
 * Единый источник истины. Содержит ровно те поля, что нужны UI: имя
 * (firstName/lastName), отображаемое имя, username для @mention, email
 * для поиска и подсказки.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Пользователь для picker (assignee / @mention)")
public class UserPickerDto {
    private String id;
    private String firstName;
    private String lastName;
    private String displayName;
    private String username;
    private String email;
}
