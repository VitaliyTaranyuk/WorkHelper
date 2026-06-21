package ru.worktechlab.work_task.authorization;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;
import ru.worktechlab.work_task.validators.GenderValidator;

import java.lang.annotation.*;

@Documented
@Target(ElementType.FIELD)
@Retention(RetentionPolicy.RUNTIME)
@Constraint(validatedBy = GenderValidator.class)
public @interface ValidGender {
    String message() default "Некорректное значение для Gender. Допустимые значения: MALE, FEMALE";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};
}
