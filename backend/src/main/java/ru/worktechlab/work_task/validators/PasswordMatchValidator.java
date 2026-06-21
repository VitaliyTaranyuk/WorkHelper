package ru.worktechlab.work_task.validators;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;
import ru.worktechlab.work_task.authorization.PasswordMatch;
import ru.worktechlab.work_task.dto.users.RegisterDTO;

public class PasswordMatchValidator implements ConstraintValidator<PasswordMatch, RegisterDTO> {

    @Override
    public boolean isValid(RegisterDTO dto, ConstraintValidatorContext context) {
        if (dto.getPassword() == null || dto.getConfirmPassword() == null) {
            return false;
        }

        if (!dto.getPassword().equals(dto.getConfirmPassword())) {
            context.disableDefaultConstraintViolation();

            context.buildConstraintViolationWithTemplate("Пароли не совпадают")
                    .addPropertyNode("confirmPassword")
                    .addConstraintViolation();

            return false;
        }

        return true;
    }
}
