package ru.worktechlab.work_task.services;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import ru.worktechlab.work_task.TestFixtures;
import ru.worktechlab.work_task.dto.UserAndProjectData;
import ru.worktechlab.work_task.dto.sprints.SprintDtoRequest;
import ru.worktechlab.work_task.dto.sprints.SprintInfoDTO;
import ru.worktechlab.work_task.exceptions.BadRequestException;
import ru.worktechlab.work_task.exceptions.NotFoundException;
import ru.worktechlab.work_task.mappers.SprintMapper;
import ru.worktechlab.work_task.models.tables.Project;
import ru.worktechlab.work_task.models.tables.Sprint;
import ru.worktechlab.work_task.models.tables.User;
import ru.worktechlab.work_task.models.tables.TaskModel;
import ru.worktechlab.work_task.repositories.SprintsRepository;
import ru.worktechlab.work_task.repositories.TaskRepository;
import ru.worktechlab.work_task.utils.CheckerUtil;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SprintsServiceTest {

    @Mock private SprintsRepository sprintsRepository;
    @Mock private SprintMapper sprintMapper;
    @Mock private CheckerUtil checkerUtil;
    @Mock private TaskRepository taskRepository;
    @Mock private ru.worktechlab.work_task.mappers.TaskMapper taskMapper;

    private TaskPlacementService taskPlacementService;
    private SprintsService sprintsService;

    private User owner;
    private Project project;
    private Sprint sprint;

    @BeforeEach
    void setUp() {
        // реальный TaskPlacementService: инвариант статус↔спринт проверяется поведением
        taskPlacementService = new TaskPlacementService(sprintsRepository);
        sprintsService = new SprintsService(sprintsRepository, sprintMapper, checkerUtil,
                taskRepository, taskMapper, taskPlacementService);
        owner = TestFixtures.ownerUser("owner-1");
        project = TestFixtures.project("project-1", owner);
        sprint = TestFixtures.sprint("sprint-1", project, owner);
    }

    @Test
    void findSprintById_shouldReturnSprint_whenFound() throws Exception {
        when(sprintsRepository.findById("sprint-1")).thenReturn(Optional.of(sprint));

        Sprint result = sprintsService.findSprintById("sprint-1");

        assertThat(result).isEqualTo(sprint);
    }

    @Test
    void findSprintById_shouldThrowNotFoundException_whenNotFound() throws Exception {
        when(sprintsRepository.findById("missing")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> sprintsService.findSprintById("missing"))
                .isInstanceOf(NotFoundException.class)
                .hasMessageContaining("missing");
    }

    @Test
    void findSprintByIdAndProject_shouldThrowNotFoundException_whenSprintNotInProject() throws Exception {
        when(sprintsRepository.findSprintByIdAndProject("sprint-99", project))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> sprintsService.findSprintByIdAndProject("sprint-99", project))
                .isInstanceOf(NotFoundException.class);
    }

    @Test
    void checkHasActiveSprint_shouldNotThrow_whenSprintIsAlreadyActive() throws Exception {
        org.springframework.test.util.ReflectionTestUtils.setField(sprint, "active", true);

        sprintsService.checkHasActiveSprint(sprint);

        verify(sprintsRepository, never()).hasActiveSprint(any());
    }

    @Test
    void checkHasActiveSprint_shouldNotThrow_whenNoOtherActiveSprintExists() throws Exception {
        org.springframework.test.util.ReflectionTestUtils.setField(sprint, "active", false);
        when(sprintsRepository.hasActiveSprint(project.getId())).thenReturn(false);

        sprintsService.checkHasActiveSprint(sprint);
    }

    @Test
    void checkHasActiveSprint_shouldThrowBadRequestException_whenAnotherSprintIsActive() throws Exception {
        org.springframework.test.util.ReflectionTestUtils.setField(sprint, "active", false);
        when(sprintsRepository.hasActiveSprint(project.getId())).thenReturn(true);

        assertThatThrownBy(() -> sprintsService.checkHasActiveSprint(sprint))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining(project.getName());
    }

    @Test
    void createSprint_shouldSaveAndReturnSprintInfo() throws Exception {
        SprintDtoRequest request = new SprintDtoRequest();
        request.setName("Sprint 2");
        request.setGoal("Complete feature X");
        request.setStartDate(LocalDate.now());
        request.setEndDate(LocalDate.now().plusWeeks(2));

        UserAndProjectData data = new UserAndProjectData(project, owner);
        SprintInfoDTO expectedDto = mock(SprintInfoDTO.class);

        when(checkerUtil.findAndCheckProjectUserData("project-1", false, false)).thenReturn(data);
        when(sprintsRepository.saveAndFlush(any(Sprint.class))).thenReturn(sprint);
        when(sprintsRepository.findById(sprint.getId())).thenReturn(Optional.of(sprint));
        when(sprintMapper.toSprintInfoDto(sprint)).thenReturn(expectedDto);

        SprintInfoDTO result = sprintsService.createSprint("project-1", request);

        assertThat(result).isEqualTo(expectedDto);
        verify(sprintsRepository).saveAndFlush(any(Sprint.class));
    }

    @Test
    void resolveSprintForTask_shouldReturnDefaultBacklog_whenSprintIdIsNull() throws Exception {
        Sprint backlog = TestFixtures.defaultSprint("backlog-1", project, owner);
        when(sprintsRepository.findDefaultSprintByProject(project)).thenReturn(Optional.of(backlog));

        Sprint result = sprintsService.resolveSprintForTask(null, project);

        assertThat(result).isEqualTo(backlog);
        verify(sprintsRepository, never()).findSprintByIdAndProject(any(), any());
    }

    @Test
    void resolveSprintForTask_shouldReturnSpecifiedSprint_whenSprintIdProvided() throws Exception {
        when(sprintsRepository.findSprintByIdAndProject("sprint-1", project)).thenReturn(Optional.of(sprint));

        Sprint result = sprintsService.resolveSprintForTask("sprint-1", project);

        assertThat(result).isEqualTo(sprint);
        verify(sprintsRepository, never()).findDefaultSprintByProject(any());
    }

    @Test
    void resolveSprintForTask_shouldThrowNotFoundException_whenNoDefaultSprintExists() throws Exception {
        when(sprintsRepository.findDefaultSprintByProject(project)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> sprintsService.resolveSprintForTask("  ", project))
                .isInstanceOf(NotFoundException.class)
                .hasMessageContaining(project.getName());
    }

    @Test
    void getActiveSprint_shouldThrowNotFoundException_whenNoActiveSprint() throws Exception {
        UserAndProjectData data = new UserAndProjectData(project, owner);

        when(checkerUtil.findAndCheckProjectUserData("project-1", false, false)).thenReturn(data);
        when(sprintsRepository.getSprintInfoByProjectId(project)).thenReturn(null);

        assertThatThrownBy(() -> sprintsService.getActiveSprint("project-1"))
                .isInstanceOf(NotFoundException.class)
                .hasMessageContaining(project.getName());
    }

    @Test
    void archiveSprint_shouldSetArchived() throws Exception {
        UserAndProjectData data = new UserAndProjectData(project, owner);
        when(checkerUtil.findAndCheckProjectUserData("project-1", false, false)).thenReturn(data);
        when(sprintsRepository.findSprintByIdForUpdate("sprint-1", "project-1")).thenReturn(Optional.of(sprint));
        when(sprintsRepository.findById("sprint-1")).thenReturn(Optional.of(sprint));
        when(sprintMapper.toSprintInfoDto(sprint)).thenReturn(mock(SprintInfoDTO.class));

        sprintsService.archiveSprint("sprint-1", "project-1");

        assertThat(sprint.isArchived()).isTrue();
    }

    @Test
    void archiveSprint_shouldThrow_whenDefaultSprint() throws Exception {
        Sprint backlog = TestFixtures.defaultSprint("backlog-1", project, owner);
        UserAndProjectData data = new UserAndProjectData(project, owner);
        when(checkerUtil.findAndCheckProjectUserData("project-1", false, false)).thenReturn(data);
        when(sprintsRepository.findSprintByIdForUpdate("backlog-1", "project-1")).thenReturn(Optional.of(backlog));

        assertThatThrownBy(() -> sprintsService.archiveSprint("backlog-1", "project-1"))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    void pauseSprint_shouldSetPaused_whenSprintActive() throws Exception {
        org.springframework.test.util.ReflectionTestUtils.setField(sprint, "active", true);
        UserAndProjectData data = new UserAndProjectData(project, owner);
        when(checkerUtil.findAndCheckProjectUserData("project-1", false, false)).thenReturn(data);
        when(sprintsRepository.findSprintByIdForUpdate("sprint-1", "project-1")).thenReturn(Optional.of(sprint));
        when(sprintsRepository.findById("sprint-1")).thenReturn(Optional.of(sprint));
        when(sprintMapper.toSprintInfoDto(sprint)).thenReturn(mock(SprintInfoDTO.class));

        sprintsService.pauseSprint("sprint-1", "project-1");

        assertThat(sprint.isPaused()).isTrue();
    }

    @Test
    void pauseSprint_shouldThrow_whenSprintNotActive() throws Exception {
        org.springframework.test.util.ReflectionTestUtils.setField(sprint, "active", false);
        UserAndProjectData data = new UserAndProjectData(project, owner);
        when(checkerUtil.findAndCheckProjectUserData("project-1", false, false)).thenReturn(data);
        when(sprintsRepository.findSprintByIdForUpdate("sprint-1", "project-1")).thenReturn(Optional.of(sprint));

        assertThatThrownBy(() -> sprintsService.pauseSprint("sprint-1", "project-1"))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    void resumeSprint_shouldClearPaused_whenSprintPaused() throws Exception {
        org.springframework.test.util.ReflectionTestUtils.setField(sprint, "active", true);
        org.springframework.test.util.ReflectionTestUtils.setField(sprint, "paused", true);
        UserAndProjectData data = new UserAndProjectData(project, owner);
        when(checkerUtil.findAndCheckProjectUserData("project-1", false, false)).thenReturn(data);
        when(sprintsRepository.findSprintByIdForUpdate("sprint-1", "project-1")).thenReturn(Optional.of(sprint));
        when(sprintsRepository.findById("sprint-1")).thenReturn(Optional.of(sprint));
        when(sprintMapper.toSprintInfoDto(sprint)).thenReturn(mock(SprintInfoDTO.class));

        sprintsService.resumeSprint("sprint-1", "project-1");

        assertThat(sprint.isPaused()).isFalse();
    }

    @Test
    void resumeSprint_shouldThrow_whenSprintNotPaused() throws Exception {
        org.springframework.test.util.ReflectionTestUtils.setField(sprint, "paused", false);
        UserAndProjectData data = new UserAndProjectData(project, owner);
        when(checkerUtil.findAndCheckProjectUserData("project-1", false, false)).thenReturn(data);
        when(sprintsRepository.findSprintByIdForUpdate("sprint-1", "project-1")).thenReturn(Optional.of(sprint));

        assertThatThrownBy(() -> sprintsService.resumeSprint("sprint-1", "project-1"))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    void finishSprint_shouldDeactivateSprint() throws Exception {
        org.springframework.test.util.ReflectionTestUtils.setField(sprint, "active", true);
        UserAndProjectData data = new UserAndProjectData(project, owner);
        when(checkerUtil.findAndCheckProjectUserData("project-1", false, false)).thenReturn(data);
        when(sprintsRepository.findSprintByIdForUpdate("sprint-1", "project-1")).thenReturn(Optional.of(sprint));
        when(sprintsRepository.findById("sprint-1")).thenReturn(Optional.of(sprint));
        when(taskRepository.findAllBySprint(sprint)).thenReturn(List.of());
        when(sprintMapper.toSprintInfoDto(sprint)).thenReturn(mock(SprintInfoDTO.class));

        sprintsService.finishSprint("sprint-1", "project-1");

        assertThat(sprint.isActive()).isFalse();
        assertThat(sprint.getFinishedAt()).isNotNull();
        assertThat(sprint.getStatus()).isEqualTo(ru.worktechlab.work_task.models.enums.SprintStatus.COMPLETED);
    }

    @Test
    void sprintStatus_shouldReflectLifecycle() {
        assertThat(sprint.getStatus()).isEqualTo(ru.worktechlab.work_task.models.enums.SprintStatus.DRAFT);
        sprint.activate();
        assertThat(sprint.getStatus()).isEqualTo(ru.worktechlab.work_task.models.enums.SprintStatus.ACTIVE);
        sprint.pause();
        assertThat(sprint.getStatus()).isEqualTo(ru.worktechlab.work_task.models.enums.SprintStatus.PAUSED);
        sprint.resume();
        assertThat(sprint.getStatus()).isEqualTo(ru.worktechlab.work_task.models.enums.SprintStatus.ACTIVE);
        sprint.finish(owner);
        assertThat(sprint.getStatus()).isEqualTo(ru.worktechlab.work_task.models.enums.SprintStatus.COMPLETED);
    }

    @Test
    void deleteSprint_shouldMoveTasksToBacklogAndDelete() throws Exception {
        Sprint backlog = TestFixtures.defaultSprint("backlog-1", project, owner);
        UserAndProjectData data = new UserAndProjectData(project, owner);
        when(checkerUtil.findAndCheckProjectUserData("project-1", false, false)).thenReturn(data);
        when(sprintsRepository.findSprintByIdForUpdate("sprint-1", "project-1")).thenReturn(Optional.of(sprint));
        when(sprintsRepository.findDefaultSprintByProject(project)).thenReturn(Optional.of(backlog));
        TaskModel task = TestFixtures.task("task-1", owner, project, sprint, TestFixtures.defaultStatus(project));
        when(taskRepository.findAllBySprint(sprint)).thenReturn(List.of(task));

        sprintsService.deleteSprint("sprint-1", "project-1");

        assertThat(task.getSprint()).isEqualTo(backlog);
        verify(sprintsRepository).delete(sprint);
    }

    @Test
    void deleteSprint_shouldKeepTaskStatus_whenMovedToBacklog() throws Exception {
        // ТП-49: бэклог — спринт, а не статус; перенос сохраняет статус задачи
        Sprint backlog = TestFixtures.defaultSprint("backlog-1", project, owner);
        var backlogStatus = TestFixtures.defaultStatus(project);
        var boardStatus = TestFixtures.status("IN_PROGRESS", project);
        project.getStatuses().add(backlogStatus);
        project.getStatuses().add(boardStatus);

        UserAndProjectData data = new UserAndProjectData(project, owner);
        when(checkerUtil.findAndCheckProjectUserData("project-1", false, false)).thenReturn(data);
        when(sprintsRepository.findSprintByIdForUpdate("sprint-1", "project-1")).thenReturn(Optional.of(sprint));
        when(sprintsRepository.findDefaultSprintByProject(project)).thenReturn(Optional.of(backlog));
        TaskModel task = TestFixtures.task("task-1", owner, project, sprint, boardStatus);
        when(taskRepository.findAllBySprint(sprint)).thenReturn(List.of(task));

        sprintsService.deleteSprint("sprint-1", "project-1");

        assertThat(task.getSprint()).isEqualTo(backlog);
        assertThat(task.getStatus()).isEqualTo(boardStatus);
    }

    @Test
    void archiveSprint_shouldMoveActiveTasksToBacklog_andKeepArchivedInSprint() throws Exception {
        Sprint backlog = TestFixtures.defaultSprint("backlog-1", project, owner);
        var backlogStatus = TestFixtures.defaultStatus(project);
        var boardStatus = TestFixtures.status("IN_PROGRESS", project);
        project.getStatuses().add(backlogStatus);
        project.getStatuses().add(boardStatus);

        UserAndProjectData data = new UserAndProjectData(project, owner);
        when(checkerUtil.findAndCheckProjectUserData("project-1", false, false)).thenReturn(data);
        when(sprintsRepository.findSprintByIdForUpdate("sprint-1", "project-1")).thenReturn(Optional.of(sprint));
        when(sprintsRepository.findById("sprint-1")).thenReturn(Optional.of(sprint));
        when(sprintsRepository.findDefaultSprintByProject(project)).thenReturn(Optional.of(backlog));
        when(sprintMapper.toSprintInfoDto(sprint)).thenReturn(mock(SprintInfoDTO.class));

        TaskModel activeTask = TestFixtures.task("task-1", owner, project, sprint, boardStatus);
        TaskModel archivedTask = TestFixtures.task("task-2", owner, project, sprint, boardStatus);
        archivedTask.setArchived(true);
        when(taskRepository.findAllBySprint(sprint)).thenReturn(List.of(activeTask, archivedTask));

        sprintsService.archiveSprint("sprint-1", "project-1");

        assertThat(sprint.isArchived()).isTrue();
        assertThat(activeTask.getSprint()).isEqualTo(backlog);
        // ТП-49: перенос в бэклог сохраняет статус задачи
        assertThat(activeTask.getStatus()).isEqualTo(boardStatus);
        // архивная задача сохраняет историческую связь со спринтом и статус
        assertThat(archivedTask.getSprint()).isEqualTo(sprint);
        assertThat(archivedTask.getStatus()).isEqualTo(boardStatus);
    }

    @Test
    void finishSprint_shouldArchiveDoneTasks_byLastVisibleColumn() throws Exception {
        org.springframework.test.util.ReflectionTestUtils.setField(sprint, "active", true);
        Sprint backlog = TestFixtures.defaultSprint("backlog-1", project, owner);
        var backlogStatus = new ru.worktechlab.work_task.models.tables.TaskStatus(1, "Backlog", "Backlog", false, true, project);
        var todo = new ru.worktechlab.work_task.models.tables.TaskStatus(2, "To Do", "To Do", true, false, project);
        // код "Done" (не "DONE") — как у реально создаваемых проектов;
        // завершающая колонка определяется по max priority среди видимых
        var done = new ru.worktechlab.work_task.models.tables.TaskStatus(5, "Done", "Done", true, false, project);
        var canceled = new ru.worktechlab.work_task.models.tables.TaskStatus(6, "Canceled", "Canceled", false, false, project);
        org.springframework.test.util.ReflectionTestUtils.setField(backlogStatus, "id", 1L);
        org.springframework.test.util.ReflectionTestUtils.setField(todo, "id", 2L);
        org.springframework.test.util.ReflectionTestUtils.setField(done, "id", 5L);
        org.springframework.test.util.ReflectionTestUtils.setField(canceled, "id", 6L);
        project.getStatuses().addAll(List.of(backlogStatus, todo, done, canceled));

        UserAndProjectData data = new UserAndProjectData(project, owner);
        when(checkerUtil.findAndCheckProjectUserData("project-1", false, false)).thenReturn(data);
        when(sprintsRepository.findSprintByIdForUpdate("sprint-1", "project-1")).thenReturn(Optional.of(sprint));
        when(sprintsRepository.findById("sprint-1")).thenReturn(Optional.of(sprint));
        when(sprintsRepository.findDefaultSprintByProject(project)).thenReturn(Optional.of(backlog));
        when(sprintMapper.toSprintInfoDto(sprint)).thenReturn(mock(SprintInfoDTO.class));

        TaskModel doneTask = TestFixtures.task("task-1", owner, project, sprint, done);
        TaskModel unfinished = TestFixtures.task("task-2", owner, project, sprint, todo);
        when(taskRepository.findAllBySprint(sprint)).thenReturn(List.of(doneTask, unfinished));

        sprintsService.finishSprint("sprint-1", "project-1");

        // Done-задача архивируется и сохраняет спринт; незавершённая уходит в Backlog
        assertThat(doneTask.isArchived()).isTrue();
        assertThat(doneTask.getCompletedDate()).isNotNull();
        assertThat(doneTask.getSprint()).isEqualTo(sprint);
        assertThat(unfinished.isArchived()).isFalse();
        assertThat(unfinished.getSprint()).isEqualTo(backlog);
        // ТП-49: статус незавершённой задачи сохраняется при уходе в бэклог
        assertThat(unfinished.getStatus()).isEqualTo(todo);
    }

    @Test
    void finishSprint_shouldMoveUnfinishedTasksToBacklog() throws Exception {
        org.springframework.test.util.ReflectionTestUtils.setField(sprint, "active", true);
        Sprint backlog = TestFixtures.defaultSprint("backlog-1", project, owner);
        var backlogStatus = TestFixtures.defaultStatus(project);
        var boardStatus = TestFixtures.status("IN_PROGRESS", project);
        // последняя видимая колонка — Done; задача в IN_PROGRESS не завершена
        var doneStatus = new ru.worktechlab.work_task.models.tables.TaskStatus(5, "Done", "Done", true, false, project);
        org.springframework.test.util.ReflectionTestUtils.setField(backlogStatus, "id", 1L);
        org.springframework.test.util.ReflectionTestUtils.setField(boardStatus, "id", 2L);
        org.springframework.test.util.ReflectionTestUtils.setField(doneStatus, "id", 5L);
        project.getStatuses().add(backlogStatus);
        project.getStatuses().add(boardStatus);
        project.getStatuses().add(doneStatus);

        UserAndProjectData data = new UserAndProjectData(project, owner);
        when(checkerUtil.findAndCheckProjectUserData("project-1", false, false)).thenReturn(data);
        when(sprintsRepository.findSprintByIdForUpdate("sprint-1", "project-1")).thenReturn(Optional.of(sprint));
        when(sprintsRepository.findById("sprint-1")).thenReturn(Optional.of(sprint));
        when(sprintsRepository.findDefaultSprintByProject(project)).thenReturn(Optional.of(backlog));
        when(sprintMapper.toSprintInfoDto(sprint)).thenReturn(mock(SprintInfoDTO.class));

        TaskModel unfinished = TestFixtures.task("task-1", owner, project, sprint, boardStatus);
        when(taskRepository.findAllBySprint(sprint)).thenReturn(List.of(unfinished));

        sprintsService.finishSprint("sprint-1", "project-1");

        assertThat(unfinished.getSprint()).isEqualTo(backlog);
        // ТП-49: статус сохраняется — бэклог не статус
        assertThat(unfinished.getStatus()).isEqualTo(boardStatus);
    }
}
