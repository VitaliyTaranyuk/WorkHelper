package ru.worktechlab.work_task.validators;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;

import java.lang.annotation.*;

@Documented
@Target(ElementType.FIELD)
@Retention(RetentionPolicy.RUNTIME)
@Constraint(validatedBy = SprintIdValidator.class)
public @interface ValidSprintId {
    String message() default "Спринт закрыт или не существует";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};
}
