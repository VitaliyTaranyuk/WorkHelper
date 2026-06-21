package ru.worktechlab.work_task.validators;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;
import ru.worktechlab.work_task.models.enums.TaskType;

import java.util.Arrays;

public class TaskTypeValidator implements ConstraintValidator<ValidTaskType, String> {

    @Override
    public boolean isValid(String value, ConstraintValidatorContext context) {
        if (value == null) return false;
        return Arrays.stream(TaskType.values())
                .map(Enum::name)
                .anyMatch(v -> v.equals(value));
    }
}
