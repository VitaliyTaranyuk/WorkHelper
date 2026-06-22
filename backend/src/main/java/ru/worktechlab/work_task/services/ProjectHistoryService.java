package ru.worktechlab.work_task.services;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import ru.worktechlab.work_task.annotations.TransactionMandatory;
import ru.worktechlab.work_task.annotations.TransactionRequired;
import ru.worktechlab.work_task.dto.history.ProjectHistoryDto;
import ru.worktechlab.work_task.exceptions.NotFoundException;
import ru.worktechlab.work_task.models.tables.ProjectHistory;
import ru.worktechlab.work_task.models.tables.User;
import ru.worktechlab.work_task.repositories.ProjectHistoryRepository;
import ru.worktechlab.work_task.utils.CheckerUtil;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ProjectHistoryService {

    public static final String COLUMN_RENAME = "COLUMN_RENAME";
    public static final String COLUMN_CREATE = "COLUMN_CREATE";
    public static final String COLUMN_DELETE = "COLUMN_DELETE";

    private final ProjectHistoryRepository repository;
    private final CheckerUtil checkerUtil;

    @TransactionMandatory
    public void record(String projectId, String changeType, String oldValue, String newValue, User user) {
        repository.save(new ProjectHistory(projectId, changeType, oldValue, newValue, user));
    }

    @TransactionRequired
    public List<ProjectHistoryDto> getHistory(String projectId) throws NotFoundException {
        checkerUtil.findAndCheckProjectUserData(projectId, false, false);
        return repository.findByProjectIdOrderByCreatedAtDesc(projectId).stream()
                .map(this::toDto)
                .toList();
    }

    private ProjectHistoryDto toDto(ProjectHistory h) {
        User user = h.getUser();
        String userName = null;
        String username = null;
        if (user != null) {
            username = user.getUsername();
            userName = (user.getDisplayName() != null && !user.getDisplayName().isBlank())
                    ? user.getDisplayName()
                    : String.format("%s %s", user.getFirstName(), user.getLastName());
        }
        return new ProjectHistoryDto(h.getChangeType(), h.getOldValue(), h.getNewValue(),
                userName, username, h.getCreatedAt());
    }
}
