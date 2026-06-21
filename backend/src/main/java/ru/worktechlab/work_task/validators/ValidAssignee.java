package ru.worktechlab.work_task.validators;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;

import java.lang.annotation.*;

@Documented
@Target(ElementType.FIELD)
@Retention(RetentionPolicy.RUNTIME)
@Constraint(validatedBy = AssigneeValidator.class)
public @interface ValidAssignee {
    String message() default "Исполнитель с таким ID не найден или не активен";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};
}