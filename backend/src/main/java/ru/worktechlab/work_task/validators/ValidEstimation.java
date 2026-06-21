package ru.worktechlab.work_task.validators;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;

import java.lang.annotation.*;

@Target({ElementType.FIELD, ElementType.PARAMETER})
@Retention(RetentionPolicy.RUNTIME)
@Constraint(validatedBy = ValidateEstimation.class)
@Documented
public @interface ValidEstimation {
    String message() default "Некорректное значение ESTIMATION";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};
}
