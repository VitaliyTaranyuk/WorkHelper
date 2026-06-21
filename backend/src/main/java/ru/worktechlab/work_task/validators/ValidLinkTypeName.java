package ru.worktechlab.work_task.validators;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;

import java.lang.annotation.*;

@Documented
@Target(ElementType.FIELD)
@Retention(RetentionPolicy.RUNTIME)
@Constraint(validatedBy = LinkTypeNameValidator.class)
public @interface ValidLinkTypeName {
    String message() default "Некорректное значение LinkTypeName";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};
}