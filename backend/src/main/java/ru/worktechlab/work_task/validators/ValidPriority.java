package ru.worktechlab.work_task.validators;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;

import java.lang.annotation.*;

@Documented
@Target(ElementType.FIELD)
@Retention(RetentionPolicy.RUNTIME)
@Constraint(validatedBy = PriorityValidator.class)
public @interface ValidPriority {
    String message() default "Некорректное значение PRIORITY";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};
}
