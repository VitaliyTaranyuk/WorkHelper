package ru.worktechlab.work_task.validators;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;
import ru.worktechlab.work_task.models.enums.LinkTypeName;

import java.util.Arrays;

public class LinkTypeNameValidator implements ConstraintValidator<ValidLinkTypeName, String> {
    @Override
    public boolean isValid(String value, ConstraintValidatorContext context) {
        if (value == null) return false;
        return Arrays.stream(LinkTypeName.values())
                .map(Enum::name)
                .anyMatch(v -> v.equals(value));
    }
}
