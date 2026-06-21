package ru.worktechlab.work_task.validators;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;

import java.lang.annotation.*;

@Documented
@Target(ElementType.FIELD)
@Retention(RetentionPolicy.RUNTIME)
@Constraint(validatedBy = TaskTypeValidator.class)
public @interface ValidTaskType {
    String message() default "Некорректное значение TASK_TYPE";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};
}
