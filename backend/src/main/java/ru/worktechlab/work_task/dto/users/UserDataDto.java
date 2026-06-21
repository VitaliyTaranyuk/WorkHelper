package ru.worktechlab.work_task.dto.users;

import com.fasterxml.jackson.annotation.JsonFormat;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;
import ru.worktechlab.work_task.dto.roles.RoleDataDto;

import java.time.LocalDate;
import java.util.List;

@Getter
@Setter
public class UserDataDto {
    @NotBlank(message = "ИД не может быть пустым")
    @Schema(description = "ИД пользователя")
    private String userId;

    @Schema(description = "ИД последнего проекта")
    private String lastProjectId;

    @Schema(description = "Фамилия пользователя", example = "Пин")
    @NotBlank(message = "Фамилия не может быть пустым")
    private String lastName;

    @Schema(description = "Имя пользователя", example = "Ян")
    @NotBlank(message = "Имя не может быть пустым")
    private String firstName;

    @Schema(description = "Отчество пользователя, при наличии", example = "Сигизмундович")
    private String middleName;

    @Schema(description = "Email пользователя", example = "user@gmail.com")
    @NotBlank(message = "Email не может быть пустым")
    @Email(message = "Неверный формат email")
    private String email;

    @Schema(description = "Номер телефона пользователя", example = "89999999999")
    private String phone;

    @Schema(description = "Дата рождения пользователя", example = "2020-01-01")
    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate birthDate;

    @Schema(description = "Флаг активации", example = "true")
    private boolean active;

    @Schema(description = "Пол пользователя", example = "MALE")
    private String gender;

    @Schema(description = "Роли пользователя")
    private List<RoleDataDto> roles;

    @Schema(description = "Проекты пользователя с указанием его полномочий")
    private List<UsersProjectsDTO> permissionProjects;
}
