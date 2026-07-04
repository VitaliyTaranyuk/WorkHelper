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
 * ТП-49: спринт и статус — независимые оси. Бэклог — это спринт, а не статус:
 * переносы между спринтами не трогают статус, смена статуса не трогает спринт.
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
    private TaskStatus todoStatus;      // default, первая колонка
    private TaskStatus inProgressStatus;
    private TaskStatus canceledStatus;  // скрытая

    @BeforeEach
    void setUp() {
        owner = TestFixtures.ownerUser("owner-1");
        project = TestFixtures.project("project-1", owner);
        backlog = TestFixtures.defaultSprint("backlog-1", project, owner);
        sprint = TestFixtures.sprint("sprint-1", project, owner);

        todoStatus = new TaskStatus(1, "To Do", "To Do", true, true, true, project);
        ReflectionTestUtils.setField(todoStatus, "id", 1L);
        inProgressStatus = new TaskStatus(2, "In Progress", "In Progress", true, false, true, project);
        ReflectionTestUtils.setField(inProgressStatus, "id", 2L);
        canceledStatus = new TaskStatus(5, "Canceled", "Canceled", false, false, true, project);
        ReflectionTestUtils.setField(canceledStatus, "id", 5L);

        project.getStatuses().add(todoStatus);
        project.getStatuses().add(inProgressStatus);
        project.getStatuses().add(canceledStatus);
    }

    @Test
    void initialStatusFor_shouldReturnFirstBoardColumn_forAnySprint() throws Exception {
        // спринт не влияет на статус — и для бэклога, и для обычного спринта
        assertThat(placement.initialStatusFor(backlog, project)).isEqualTo(todoStatus);
        assertThat(placement.initialStatusFor(sprint, project)).isEqualTo(todoStatus);
    }

    @Test
    void initialStatusFor_withRequestedStatus_shouldApply_forActiveBoardSprint() throws Exception {
        // ТП-74: sprint активен (досковый) → явно выбранная видимая колонка применяется
        when(sprintsRepository.getSprintInfoByProjectId(project)).thenReturn(sprint);
        assertThat(placement.initialStatusFor(sprint, project, 2L)).isEqualTo(inProgressStatus);
    }

    @Test
    void initialStatusFor_withRequestedStatus_shouldIgnore_forNonBoardSprint() throws Exception {
        // ТП-74: активен sprint → backlog не досковый → запрошенный статус
        // игнорируется, назначается первая колонка (защита от обхода через API)
        when(sprintsRepository.getSprintInfoByProjectId(project)).thenReturn(sprint);
        assertThat(placement.initialStatusFor(backlog, project, 2L)).isEqualTo(todoStatus);
    }

    @Test
    void initialStatusFor_withHiddenRequestedStatus_shouldThrow_onBoard() {
        when(sprintsRepository.getSprintInfoByProjectId(project)).thenReturn(sprint);
        assertThatThrownBy(() -> placement.initialStatusFor(sprint, project, 5L))
                .isInstanceOf(NotFoundException.class);
    }

    @Test
    void initialStatusFor_withUnknownRequestedStatus_shouldThrow_onBoard() {
        when(sprintsRepository.getSprintInfoByProjectId(project)).thenReturn(sprint);
        assertThatThrownBy(() -> placement.initialStatusFor(sprint, project, 999L))
                .isInstanceOf(NotFoundException.class);
    }

    @Test
    void isOnBoard_shouldBeTrueForActiveSprint_andFalseForBacklog() throws Exception {
        when(sprintsRepository.getSprintInfoByProjectId(project)).thenReturn(sprint);
        assertThat(placement.isOnBoard(project, sprint)).isTrue();
        assertThat(placement.isOnBoard(project, backlog)).isFalse();
        assertThat(placement.isOnBoard(project, null)).isFalse();
    }

    @Test
    void firstBoardStatus_shouldThrow_whenNoVisibleColumns() {
        Project empty = TestFixtures.project("project-2", owner);
        empty.getStatuses().add(canceledStatus);

        assertThatThrownBy(() -> placement.firstBoardStatus(empty))
                .isInstanceOf(NotFoundException.class);
    }

    @Test
    void completedBoardStatus_shouldReturnLastVisibleNonDefaultColumn() {
        assertThat(placement.completedBoardStatus(project)).contains(inProgressStatus);
    }

    @Test
    void completedBoardStatus_shouldBeEmpty_whenNoVisibleColumns() {
        Project empty = TestFixtures.project("project-empty", owner);
        empty.getStatuses().add(canceledStatus);

        assertThat(placement.completedBoardStatus(empty)).isEmpty();
    }

    @Test
    void placeInSprint_shouldKeepStatus_whenMovingToBacklog() throws Exception {
        // ТП-49: перенос в бэклог сохраняет статус задачи
        TaskModel task = TestFixtures.task("task-1", owner, project, sprint, inProgressStatus);

        placement.placeInSprint(task, backlog, project);

        assertThat(task.getSprint()).isEqualTo(backlog);
        assertThat(task.getStatus()).isEqualTo(inProgressStatus);
    }

    @Test
    void placeInSprint_shouldKeepStatus_whenMovingFromBacklog() throws Exception {
        TaskModel task = TestFixtures.task("task-1", owner, project, backlog, todoStatus);

        placement.placeInSprint(task, sprint, project);

        assertThat(task.getSprint()).isEqualTo(sprint);
        assertThat(task.getStatus()).isEqualTo(todoStatus);
    }

    @Test
    void applyStatusChange_shouldKeepSprint() throws Exception {
        // ТП-49: смена статуса не выдёргивает задачу из её спринта
        TaskModel task = TestFixtures.task("task-1", owner, project, backlog, todoStatus);

        placement.applyStatusChange(task, inProgressStatus, project);

        assertThat(task.getStatus()).isEqualTo(inProgressStatus);
        assertThat(task.getSprint()).isEqualTo(backlog);
    }

    @Test
    void moveToBacklog_shouldChangeOnlySprint() throws Exception {
        TaskModel task = TestFixtures.task("task-1", owner, project, sprint, inProgressStatus);
        when(sprintsRepository.findDefaultSprintByProject(project)).thenReturn(Optional.of(backlog));

        placement.moveToBacklog(task, project);

        assertThat(task.getSprint()).isEqualTo(backlog);
        assertThat(task.getStatus()).isEqualTo(inProgressStatus);
    }

    @Test
    void boardSprint_shouldPreferActiveSprint() throws Exception {
        Sprint active = TestFixtures.sprint("sprint-2", project, owner);
        when(sprintsRepository.getSprintInfoByProjectId(project)).thenReturn(active);

        assertThat(placement.boardSprint(project)).isEqualTo(active);
    }

    @Test
    void boardSprint_shouldFallBackToBacklog_whenNoActiveSprint() throws Exception {
        // kanban-режим: без активного спринта доска показывает Backlog-спринт
        when(sprintsRepository.getSprintInfoByProjectId(project)).thenReturn(null);
        when(sprintsRepository.findDefaultSprintByProject(project)).thenReturn(Optional.of(backlog));

        assertThat(placement.boardSprint(project)).isEqualTo(backlog);
    }
}
