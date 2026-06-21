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
        Boolean isActive = sprintsRepository.isSprintActive(value);
        return Boolean.TRUE.equals(isActive);
    }
}