package ru.worktechlab.work_task.services;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import ru.worktechlab.work_task.TestFixtures;
import ru.worktechlab.work_task.exceptions.NotFoundException;
import ru.worktechlab.work_task.models.tables.Project;
import ru.worktechlab.work_task.models.tables.Sprint;
import ru.worktechlab.work_task.models.tables.TaskModel;
import ru.worktechlab.work_task.models.tables.TaskStatus;
import ru.worktechlab.work_task.models.tables.User;
import ru.worktechlab.work_task.repositories.SprintsRepository;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

/**
 * Инвариант «Backlog-спринт ⟺ Backlog-статус»: задача не должна оказаться
 * в комбинации, невидимой ни на доске (статус viewed=false), ни в разделе Backlog.
 */
@ExtendWith(MockitoExtension.class)
class TaskPlacementServiceTest {

    @Mock private SprintsRepository sprintsRepository;

    @InjectMocks
    private TaskPlacementService placement;

    private User owner;
    private Project project;
    private Sprint backlog;
    private Sprint sprint;
    private TaskStatus backlogStatus;
    private TaskStatus todoStatus;
    private TaskStatus inProgressStatus;

    @BeforeEach
    void setUp() {
        owner = TestFixtures.ownerUser("owner-1");
        project = TestFixtures.project("project-1", owner);
        backlog = TestFixtures.defaultSprint("backlog-1", project, owner);
        sprint = TestFixtures.sprint("sprint-1", project, owner);

        // BACKLOG — дефолтный и скрытый с доски; TODO — первая видимая колонка
        backlogStatus = new TaskStatus(1, "BACKLOG", "Backlog", false, true, project);
        ReflectionTestUtils.setField(backlogStatus, "id", 1L);
        todoStatus = new TaskStatus(2, "TODO", "To Do", true, false, project);
        ReflectionTestUtils.setField(todoStatus, "id", 2L);
        inProgressStatus = new TaskStatus(3, "IN_PROGRESS", "In Progress", true, false, project);
        ReflectionTestUtils.setField(inProgressStatus, "id", 3L);

        project.getStatuses().add(backlogStatus);
        project.getStatuses().add(todoStatus);
        project.getStatuses().add(inProgressStatus);
    }

    @Test
    void initialStatusFor_shouldReturnBacklogStatus_forDefaultSprint() throws Exception {
        assertThat(placement.initialStatusFor(backlog, project)).isEqualTo(backlogStatus);
    }

    @Test
    void initialStatusFor_shouldReturnFirstBoardColumn_forRegularSprint() throws Exception {
        assertThat(placement.initialStatusFor(sprint, project)).isEqualTo(todoStatus);
    }

    @Test
    void initialStatusFor_withRequestedStatus_shouldReturnRequestedVisibleColumn() throws Exception {
        assertThat(placement.initialStatusFor(sprint, project, 3L)).isEqualTo(inProgressStatus);
    }

    @Test
    void initialStatusFor_withRequestedStatus_shouldIgnoreRequest_forDefaultSprint() throws Exception {
        // в Backlog-спринте выбор колонки не применяется — статус фиксирован инвариантом
        assertThat(placement.initialStatusFor(backlog, project, 3L)).isEqualTo(backlogStatus);
    }

    @Test
    void initialStatusFor_withNullRequestedStatus_shouldFallBackToFirstColumn() throws Exception {
        assertThat(placement.initialStatusFor(sprint, project, null)).isEqualTo(todoStatus);
    }

    @Test
    void initialStatusFor_withHiddenRequestedStatus_shouldThrow() {
        // скрытая колонка (BACKLOG, id=1) не может быть выбрана при создании
        assertThatThrownBy(() -> placement.initialStatusFor(sprint, project, 1L))
                .isInstanceOf(NotFoundException.class);
    }

    @Test
    void initialStatusFor_withUnknownRequestedStatus_shouldThrow() {
        assertThatThrownBy(() -> placement.initialStatusFor(sprint, project, 999L))
                .isInstanceOf(NotFoundException.class);
    }

    @Test
    void completedBoardStatus_shouldReturnLastVisibleNonDefaultColumn() {
        // последняя видимая не-default колонка: In Progress (priority 3)
        assertThat(placement.completedBoardStatus(project)).contains(inProgressStatus);
    }

    @Test
    void completedBoardStatus_shouldBeEmpty_whenNoVisibleColumns() {
        Project empty = TestFixtures.project("project-empty", owner);
        empty.getStatuses().add(backlogStatus);

        assertThat(placement.completedBoardStatus(empty)).isEmpty();
    }

    @Test
    void firstBoardStatus_shouldReturnVisibleDefault_forLegacyProjects() throws Exception {
        // старая схема: default-статус "To Do" видим и является первой колонкой
        Project legacy = TestFixtures.project("project-legacy", owner);
        TaskStatus visibleDefault = new TaskStatus(1, "To Do", "To Do", true, true, legacy);
        ReflectionTestUtils.setField(visibleDefault, "id", 10L);
        TaskStatus inProgress = new TaskStatus(2, "In Progress", "In Progress", true, false, legacy);
        ReflectionTestUtils.setField(inProgress, "id", 11L);
        legacy.getStatuses().add(visibleDefault);
        legacy.getStatuses().add(inProgress);

        assertThat(placement.firstBoardStatus(legacy)).isEqualTo(visibleDefault);
    }

    @Test
    void firstBoardStatus_shouldThrow_whenNoVisibleColumns() {
        Project empty = TestFixtures.project("project-2", owner);
        empty.getStatuses().add(backlogStatus);

        assertThatThrownBy(() -> placement.firstBoardStatus(empty))
                .isInstanceOf(NotFoundException.class);
    }

    @Test
    void placeInSprint_toBacklog_shouldResetStatusToBacklog() throws Exception {
        TaskModel task = TestFixtures.task("task-1", owner, project, sprint, inProgressStatus);

        placement.placeInSprint(task, backlog, project);

        assertThat(task.getSprint()).isEqualTo(backlog);
        assertThat(task.getStatus()).isEqualTo(backlogStatus);
    }

    @Test
    void placeInSprint_fromBacklog_shouldMoveTaskToFirstBoardColumn() throws Exception {
        TaskModel task = TestFixtures.task("task-1", owner, project, backlog, backlogStatus);

        placement.placeInSprint(task, sprint, project);

        assertThat(task.getSprint()).isEqualTo(sprint);
        assertThat(task.getStatus()).isEqualTo(todoStatus);
    }

    @Test
    void placeInSprint_betweenRegularSprints_shouldKeepBoardStatus() throws Exception {
        Sprint other = TestFixtures.sprint("sprint-2", project, owner);
        TaskModel task = TestFixtures.task("task-1", owner, project, sprint, inProgressStatus);

        placement.placeInSprint(task, other, project);

        assertThat(task.getSprint()).isEqualTo(other);
        assertThat(task.getStatus()).isEqualTo(inProgressStatus);
    }

    @Test
    void applyStatusChange_toBacklogStatus_shouldReturnTaskToBacklogSprint() throws Exception {
        TaskModel task = TestFixtures.task("task-1", owner, project, sprint, inProgressStatus);
        when(sprintsRepository.findDefaultSprintByProject(project)).thenReturn(Optional.of(backlog));

        placement.applyStatusChange(task, backlogStatus, project);

        assertThat(task.getStatus()).isEqualTo(backlogStatus);
        assertThat(task.getSprint()).isEqualTo(backlog);
    }

    @Test
    void applyStatusChange_fromBacklog_shouldMoveTaskToActiveSprint() throws Exception {
        Sprint active = TestFixtures.sprint("sprint-2", project, owner);
        active.activate();
        TaskModel task = TestFixtures.task("task-1", owner, project, backlog, backlogStatus);
        when(sprintsRepository.getSprintInfoByProjectId(project)).thenReturn(active);

        placement.applyStatusChange(task, todoStatus, project);

        assertThat(task.getStatus()).isEqualTo(todoStatus);
        assertThat(task.getSprint()).isEqualTo(active);
    }

    @Test
    void applyStatusChange_fromBacklog_withoutActiveSprint_shouldKeepBacklogSprint() throws Exception {
        // kanban-режим: спринты не используются, задача выходит на доску из Backlog
        TaskModel task = TestFixtures.task("task-1", owner, project, backlog, backlogStatus);
        when(sprintsRepository.getSprintInfoByProjectId(project)).thenReturn(null);

        placement.applyStatusChange(task, inProgressStatus, project);

        assertThat(task.getStatus()).isEqualTo(inProgressStatus);
        assertThat(task.getSprint()).isEqualTo(backlog);
    }

    @Test
    void moveToBacklog_shouldSetDefaultSprintAndStatus() throws Exception {
        TaskModel task = TestFixtures.task("task-1", owner, project, sprint, inProgressStatus);
        when(sprintsRepository.findDefaultSprintByProject(project)).thenReturn(Optional.of(backlog));

        placement.moveToBacklog(task, project);

        assertThat(task.getSprint()).isEqualTo(backlog);
        assertThat(task.getStatus()).isEqualTo(backlogStatus);
    }
}
