package ru.worktechlab.work_task.services;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import ru.worktechlab.work_task.TestFixtures;
import ru.worktechlab.work_task.dto.UserAndProjectData;
import ru.worktechlab.work_task.dto.statuses.TaskStatusRequestDto;
import ru.worktechlab.work_task.dto.statuses.UpdateRequestStatusesDto;
import ru.worktechlab.work_task.mappers.TaskStatusMapper;
import ru.worktechlab.work_task.models.tables.Project;
import ru.worktechlab.work_task.models.tables.TaskStatus;
import ru.worktechlab.work_task.models.tables.User;
import ru.worktechlab.work_task.repositories.TaskRepository;
import ru.worktechlab.work_task.repositories.TaskStatusRepository;
import ru.worktechlab.work_task.utils.CheckerUtil;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TaskStatusServiceTest {

    @Mock private TaskStatusRepository taskStatusRepository;
    @Mock private TaskStatusMapper taskStatusMapper;
    @Mock private CheckerUtil checkerUtil;
    @Mock private TaskRepository taskRepository;
    @Mock private ProjectHistoryService projectHistoryService;
    @Mock private TaskPlacementService taskPlacementService;

    @InjectMocks
    private TaskStatusService service;

    private User owner;
    private Project project;
    private TaskStatus todo;
    private TaskStatus inProgress;

    @BeforeEach
    void setUp() throws Exception {
        owner = TestFixtures.ownerUser("owner-1");
        project = TestFixtures.project("project-1", owner);
        todo = new TaskStatus(1, "To Do", "To Do", true, true, project);
        ReflectionTestUtils.setField(todo, "id", 1L);
        inProgress = new TaskStatus(2, "In Progress", "In Progress", true, false, project);
        ReflectionTestUtils.setField(inProgress, "id", 2L);
        project.getStatuses().add(todo);
        project.getStatuses().add(inProgress);

        when(checkerUtil.findAndCheckProjectUserData("project-1", false, false))
                .thenReturn(new UserAndProjectData(project, owner));
        when(taskStatusRepository.findStatusByProjectAndIdForUpdate("project-1", 1L))
                .thenReturn(Optional.of(todo));
        when(taskStatusRepository.findStatusByProjectAndIdForUpdate("project-1", 2L))
                .thenReturn(Optional.of(inProgress));
        when(taskStatusRepository.findStatusesByProject(project)).thenReturn(List.of(todo, inProgress));
    }

    /**
     * Перестановка приоритетов местами (1<->2): на task_status стоит unique
     * (project, priority), поэтому обновление должно идти в две фазы —
     * сначала временные приоритеты (отдельный flush), затем целевые.
     */
    @Test
    void updateStatuses_shouldSwapPriorities_inTwoPhases() throws Exception {
        UpdateRequestStatusesDto dto = new UpdateRequestStatusesDto();
        dto.setStatuses(List.of(
                req(1L, 2, "To Do", true, true),
                req(2L, 1, "In Progress", true, false)));

        service.updateStatuses("project-1", dto);

        assertThat(todo.getPriority()).isEqualTo(2);
        assertThat(inProgress.getPriority()).isEqualTo(1);
        // два flush: временная фаза + целевая (иначе построчные UPDATE
        // нарушают unique (project, priority))
        verify(taskStatusRepository, times(2)).flush();
    }

    private TaskStatusRequestDto req(long id, int priority, String code, boolean viewed, boolean def) {
        TaskStatusRequestDto r = new TaskStatusRequestDto();
        r.setId(id);
        r.setPriority(priority);
        r.setCode(code);
        r.setDescription(code);
        r.setViewed(viewed);
        r.setDefaultTaskStatus(def);
        return r;
    }
}
