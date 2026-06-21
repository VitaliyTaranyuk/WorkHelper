package ru.worktechlab.work_task.validators;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;

import java.lang.annotation.*;

@Target({ElementType.FIELD, ElementType.PARAMETER})
@Retention(RetentionPolicy.RUNTIME)
@Constraint(validatedBy = DesriptionValidator.class)
@Documented
public @interface ValidDescription {
    String message() default "Длина поля DESCRIPTION не может быть более 4096 символов";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};
}
