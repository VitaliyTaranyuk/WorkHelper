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
import ru.worktechlab.work_task.models.enums.BoardMode;
import ru.worktechlab.work_task.models.tables.Project;
import ru.worktechlab.work_task.models.tables.Sprint;
import ru.worktechlab.work_task.models.tables.User;
import ru.worktechlab.work_task.repositories.SprintsRepository;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

/**
 * T-519: режим доски проекта.
 *
 * <p>Kanban-поведение существовало и раньше, но включалось **отсутствием** активного
 * спринта — режимом никто не управлял. Проверяется, что теперь им управляет поле проекта,
 * что незаполненное поле означает прежнее поведение (правило №6 `PHASE5_INVARIANTS §4`) и
 * что спринты при этом целы: переключение обратимо, в отличие от отменённой T-156.
 */
@ExtendWith(MockitoExtension.class)
class BoardModeTest {

    @Mock private SprintsRepository sprintsRepository;

    @InjectMocks private TaskPlacementService taskPlacementService;

    private User owner;
    private Project project;
    private Sprint backlog;
    private Sprint active;

    @BeforeEach
    void setUp() {
        owner = TestFixtures.ownerUser("user-owner");
        project = TestFixtures.project("project-1", owner);
        backlog = TestFixtures.defaultSprint("sprint-backlog", project, owner);
        active = TestFixtures.sprint("sprint-active", project, owner);
    }

    /**
     * Стабы ставятся по одному, а не «на всякий случай»: строгий режим Mockito (**T-01**)
     * валит тест на неиспользованном стабе, и это правильно — лишний стаб скрывает, какой
     * путь на самом деле проверяется.
     */
    private void stubActiveSprint() {
        when(sprintsRepository.getSprintInfoByProjectId(project)).thenReturn(active);
    }

    private void stubBacklogOnly() {
        when(sprintsRepository.findDefaultSprintByProject(project)).thenReturn(Optional.of(backlog));
        when(sprintsRepository.getSprintInfoByProjectId(project)).thenReturn(null);
    }

    /**
     * Правило №6 фазы: существующий проект обязан сохранить прежнее поведение. Поле не
     * заполнено — доска работает как раньше, по активному спринту.
     */
    @Test
    void projectWithoutModeKeepsSprintBehaviour() throws NotFoundException {
        stubActiveSprint();

        assertThat(project.getBoardMode()).isNull();
        assertThat(taskPlacementService.boardSprint(project).getId()).isEqualTo("sprint-active");
    }

    /** Прежний неявный kanban никуда не делся: без активного спринта доска — по бэклогу. */
    @Test
    void sprintModeWithoutActiveSprintFallsBackToBacklog() throws NotFoundException {
        stubBacklogOnly();
        project.setBoardMode(BoardMode.SPRINT);

        assertThat(taskPlacementService.boardSprint(project).getId()).isEqualTo("sprint-backlog");
    }

    /**
     * Ядро задачи: в Kanban-режиме активный спринт **не** подменяет содержимое доски.
     * Раньше добиться этого можно было только не имея активного спринта вовсе.
     */
    @Test
    void kanbanModeIgnoresActiveSprint() throws NotFoundException {
        when(sprintsRepository.findDefaultSprintByProject(project)).thenReturn(Optional.of(backlog));
        project.setBoardMode(BoardMode.KANBAN);

        assertThat(taskPlacementService.boardSprint(project).getId()).isEqualTo("sprint-backlog");
        // Активный спринт даже не запрашивается — режим решает раньше.
        verify(sprintsRepository, never()).getSprintInfoByProjectId(any());
    }

    /**
     * Переключение обратимо: спринты не удаляются (T-156 отменена), поэтому возврат в
     * SPRINT возвращает активный спринт на доску.
     */
    @Test
    void switchingBackToSprintRestoresActiveSprint() throws NotFoundException {
        stubActiveSprint();
        project.setBoardMode(BoardMode.KANBAN);
        project.setBoardMode(BoardMode.SPRINT);

        assertThat(taskPlacementService.boardSprint(project).getId()).isEqualTo("sprint-active");
    }

    /** Незаполненное поле читается как SPRINT в одном месте, а не в каждом потребителе. */
    @Test
    void nullModeMeansSprint() {
        assertThat(BoardMode.orDefault(null)).isEqualTo(BoardMode.SPRINT);
        assertThat(BoardMode.orDefault(BoardMode.KANBAN)).isEqualTo(BoardMode.KANBAN);
        assertThat(project.boardModeOrDefault()).isEqualTo(BoardMode.SPRINT);
    }

    /** Переключение режима отмечается как изменение проекта. */
    @Test
    void switchingModeTouchesProject() {
        ReflectionTestUtils.setField(project, "updateDate", java.time.LocalDate.of(2020, 1, 1));

        project.setBoardMode(BoardMode.KANBAN);

        assertThat(project.getUpdateDate()).isEqualTo(java.time.LocalDate.now());
    }
}
