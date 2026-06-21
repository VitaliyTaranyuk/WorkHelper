package ru.worktechlab.work_task.validators;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;

import java.lang.annotation.*;

@Documented
@Target(ElementType.FIELD)
@Retention(RetentionPolicy.RUNTIME)
@Constraint(validatedBy = TaskStatusValidator.class)
public @interface ValidTaskStatus {
    String message() default "Некорректное значение TASK_STATUS";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};
}