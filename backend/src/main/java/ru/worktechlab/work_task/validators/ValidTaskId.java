package ru.worktechlab.work_task.validators;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;

import java.lang.annotation.*;

@Target({ElementType.FIELD, ElementType.PARAMETER})
@Retention(RetentionPolicy.RUNTIME)
@Constraint(validatedBy = TaskIdValidator.class)
@Documented
public @interface ValidTaskId {

    String message() default "Некорректный формат TASK_ID";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};
}