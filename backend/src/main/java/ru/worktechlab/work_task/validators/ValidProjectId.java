package ru.worktechlab.work_task.validators;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;

import java.lang.annotation.*;

@Documented
@Target(ElementType.FIELD)
@Retention(RetentionPolicy.RUNTIME)
@Constraint(validatedBy = ProjectIdValidator.class)
public @interface ValidProjectId {
    String message() default "Проект с таким ID не найден";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};
}
