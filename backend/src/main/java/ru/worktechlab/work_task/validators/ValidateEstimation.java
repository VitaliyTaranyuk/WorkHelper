package ru.worktechlab.work_task.validators;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

public class ValidateEstimation implements ConstraintValidator<ValidEstimation, Integer> {
    @Override
    public boolean isValid(Integer value, ConstraintValidatorContext context) {
        if (value == null) return true;
        return value < 1000 && value > -1;
    }
}
