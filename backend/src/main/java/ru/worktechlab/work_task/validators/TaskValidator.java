package ru.worktechlab.work_task.validators;

import jakarta.persistence.EntityNotFoundException;
import org.springframework.stereotype.Component;
import ru.worktechlab.work_task.models.tables.TaskModel;

import java.util.List;
@Component
public class TaskValidator {

    public void validateTasksExist(List<TaskModel> tasks, String projectId) {
        if (tasks.isEmpty()) {
            throw new EntityNotFoundException(
                    String.format("Задачи для проекта с id: %s не найдены", projectId)
            );
        }
    }
}
