package ru.worktechlab.work_task.validators;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

public class DesriptionValidator implements ConstraintValidator<ValidDescription, String> {
    @Override
    public boolean isValid(String value, ConstraintValidatorContext context) {
        if (value == null || value.isEmpty()) return true;
        return value.length() <= 4096;
    }
}
