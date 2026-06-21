package ru.worktechlab.work_task.validators;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;
import ru.worktechlab.work_task.authorization.ValidGender;
import ru.worktechlab.work_task.models.enums.Gender;

import java.util.Arrays;

public class GenderValidator implements ConstraintValidator<ValidGender, String> {

    @Override
    public boolean isValid(String value, ConstraintValidatorContext context) {
        if (value == null) return false;
        return Arrays.stream(Gender.values())
                .map(Enum::name)
                .anyMatch(v -> v.equals(value));
    }
}
