package ru.worktechlab.work_task.validators;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;
import ru.worktechlab.work_task.models.enums.Priority;

import java.util.Arrays;

public class PriorityValidator implements ConstraintValidator<ValidPriority, String> {

    @Override
    public boolean isValid(String value, ConstraintValidatorContext context) {
        if (value == null) return false;
        return Arrays.stream(Priority.values())
                .map(Enum::name)
                .anyMatch(v -> v.equals(value));
    }
}
