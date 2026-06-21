package ru.worktechlab.work_task.validators;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import ru.worktechlab.work_task.repositories.UserRepository;

@Component
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AssigneeValidator implements ConstraintValidator<ValidAssignee, String> {

    private final UserRepository userRepository;

    @Override
    public boolean isValid(String value, ConstraintValidatorContext context) {
        if (value == null) return false;
        Boolean isActive = userRepository.isUserActive(value);
        return Boolean.TRUE.equals(isActive);
    }
}




