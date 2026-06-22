package ru.worktechlab.work_task.validators;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import ru.worktechlab.work_task.repositories.SprintsRepository;

@Component
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SprintIdValidator implements ConstraintValidator<ValidSprintId, String> {

    private final SprintsRepository sprintsRepository;

    @Override
    public boolean isValid(String value, ConstraintValidatorContext context) {
        if (value == null || value.isEmpty()) return true;
        // Принимаем любой существующий спринт — задачу можно положить в backlog
        // (не-активный default-спринт), в архивный и т.д. Старая проверка на
        // isActive блокировала любое обновление задачи с sprintId, указывающим
        // на backlog или незапущенный sprint, что несовместимо с Trello/Jira UX.
        return sprintsRepository.existsById(value);
    }
}