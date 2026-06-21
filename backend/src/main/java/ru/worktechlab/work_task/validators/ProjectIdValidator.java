package ru.worktechlab.work_task.validators;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import ru.worktechlab.work_task.repositories.ProjectRepository;

@Component
@RequiredArgsConstructor
public class ProjectIdValidator implements ConstraintValidator<ValidProjectId, String> {

    private final ProjectRepository projectRepository;

    @Override
    public boolean isValid(String value, ConstraintValidatorContext context) {
        if (value == null) return false;
        return projectRepository.existsById(value);
    }

}
