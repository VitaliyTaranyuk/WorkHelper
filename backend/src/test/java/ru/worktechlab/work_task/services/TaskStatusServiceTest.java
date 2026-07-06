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
    }

    /**
     * Перестановка приоритетов местами (1<->2): на task_status стоит unique
     * (project, priority), поэтому обновление должно идти в две фазы —
     * сначала временные приоритеты (отдельный flush), затем целевые.
     */
    @Test
    void updateStatuses_shouldSwapPriorities_inTwoPhases() throws Exception {
        when(checkerUtil.findAndCheckProjectUserData("project-1", false, false))
                .thenReturn(new UserAndProjectData(project, owner));
        when(taskStatusRepository.findStatusByProjectAndIdForUpdate("project-1", 1L))
                .thenReturn(Optional.of(todo));
        when(taskStatusRepository.findStatusByProjectAndIdForUpdate("project-1", 2L))
                .thenReturn(Optional.of(inProgress));
        when(taskStatusRepository.findStatusesByProject(project)).thenReturn(List.of(todo, inProgress));

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

    // ===== ТП-32: системные (дефолтные) колонки закреплены =====

    /** Проект со схемой «системные To Do/In Progress/Done + кастомная REWIEW». */
    private Project systemProject() {
        Project p = TestFixtures.project("project-sys", owner);
        TaskStatus backlog = new TaskStatus(1, "Backlog", "Backlog", false, true, true, p);
        ReflectionTestUtils.setField(backlog, "id", 10L);
        TaskStatus sysTodo = new TaskStatus(2, "To Do", "To Do", true, false, true, p);
        ReflectionTestUtils.setField(sysTodo, "id", 11L);
        TaskStatus sysInProgress = new TaskStatus(3, "In Progress", "In Progress", true, false, true, p);
        ReflectionTestUtils.setField(sysInProgress, "id", 12L);
        TaskStatus custom = new TaskStatus(4, "REWIEW", "REWIEW", true, false, false, p);
        ReflectionTestUtils.setField(custom, "id", 13L);
        TaskStatus sysDone = new TaskStatus(5, "Done", "Done", true, false, true, p);
        ReflectionTestUtils.setField(sysDone, "id", 14L);
        p.getStatuses().addAll(List.of(backlog, sysTodo, sysInProgress, custom, sysDone));
        return p;
    }

    @Test
    void checkSystemColumnsOrder_shouldReject_whenSystemColumnsSwapped() {
        Project p = systemProject();
        // In Progress (12) и To Do (11) меняются местами
        List<TaskStatusRequestDto> statuses = List.of(
                req(10L, 1, "Backlog", false, true),
                req(12L, 2, "In Progress", true, false),
                req(11L, 3, "To Do", true, false),
                req(13L, 4, "REWIEW", true, false),
                req(14L, 5, "Done", true, false));

        org.assertj.core.api.Assertions.assertThatThrownBy(
                        () -> service.checkSystemColumnsOrder(p, statuses))
                .isInstanceOf(ru.worktechlab.work_task.exceptions.BadRequestException.class)
                .hasMessageContaining("нельзя менять местами");
    }

    @Test
    void checkSystemColumnsOrder_shouldAllow_customColumnMovedAnywhere() {
        Project p = systemProject();
        // кастомная REWIEW переезжает в начало доски — системные не тронуты
        List<TaskStatusRequestDto> statuses = List.of(
                req(10L, 1, "Backlog", false, true),
                req(13L, 2, "REWIEW", true, false),
                req(11L, 3, "To Do", true, false),
                req(12L, 4, "In Progress", true, false),
                req(14L, 5, "Done", true, false));

        org.assertj.core.api.Assertions.assertThatCode(
                        () -> service.checkSystemColumnsOrder(p, statuses))
                .doesNotThrowAnyException();
    }

    @Test
    void checkSystemColumnsOrder_shouldAllow_hidingSystemColumn() {
        Project p = systemProject();
        // скрытие системной In Progress (не перестановка): скрытые получают
        // младшие приоритеты, как в черновике фронтенда
        List<TaskStatusRequestDto> statuses = List.of(
                req(10L, 1, "Backlog", false, true),
                req(12L, 2, "In Progress", false, false),
                req(11L, 3, "To Do", true, false),
                req(13L, 4, "REWIEW", true, false),
                req(14L, 5, "Done", true, false));

        org.assertj.core.api.Assertions.assertThatCode(
                        () -> service.checkSystemColumnsOrder(p, statuses))
                .doesNotThrowAnyException();
    }

    @Test
    void checkSystemColumnsOrder_shouldAllow_renameWithoutReorder() {
        Project p = systemProject();
        List<TaskStatusRequestDto> statuses = List.of(
                req(10L, 1, "Backlog", false, true),
                req(11L, 2, "Очередь", true, false),
                req(12L, 3, "In Progress", true, false),
                req(13L, 4, "REWIEW", true, false),
                req(14L, 5, "Done", true, false));

        org.assertj.core.api.Assertions.assertThatCode(
                        () -> service.checkSystemColumnsOrder(p, statuses))
                .doesNotThrowAnyException();
    }

    @Test
    void deleteStatus_shouldReject_systemColumn() throws Exception {
        Project p = systemProject();
        TaskStatus sysInProgress = p.getStatuses().stream()
                .filter(s -> s.getId() == 12L).findFirst().orElseThrow();
        when(checkerUtil.findAndCheckProjectUserData("project-sys", false, false))
                .thenReturn(new UserAndProjectData(p, owner));
        when(taskStatusRepository.findStatusByProjectAndIdForUpdate("project-sys", 12L))
                .thenReturn(Optional.of(sysInProgress));

        org.assertj.core.api.Assertions.assertThatThrownBy(
                        () -> service.deleteStatus("project-sys", 12L))
                .isInstanceOf(ru.worktechlab.work_task.exceptions.BadRequestException.class)
                .hasMessageContaining("нельзя удалить");
        verify(taskStatusRepository, never()).delete(any(TaskStatus.class));
    }

    @Test
    void findStatusByIdAndProjectForUpdate_shouldThrow_withStatusOrientedMessage() {
        // F-009 аудита: сообщение должно говорить о СТАТУСЕ, а не о задаче.
        when(taskStatusRepository.findStatusByProjectAndIdForUpdate("project-1", 99999L))
                .thenReturn(Optional.empty());

        org.assertj.core.api.Assertions.assertThatThrownBy(
                        () -> service.findStatusByIdAndProjectForUpdate(99999L, project))
                .isInstanceOf(ru.worktechlab.work_task.exceptions.NotFoundException.class)
                .hasMessageContaining("Не найден статус")
                .hasMessageContaining("99999")
                .hasMessageNotContaining("задача");
    }

    @Test
    void deleteStatus_shouldAllow_customColumn() throws Exception {
        Project p = systemProject();
        TaskStatus custom = p.getStatuses().stream()
                .filter(s -> s.getId() == 13L).findFirst().orElseThrow();
        when(checkerUtil.findAndCheckProjectUserData("project-sys", false, false))
                .thenReturn(new UserAndProjectData(p, owner));
        when(taskStatusRepository.findStatusByProjectAndIdForUpdate("project-sys", 13L))
                .thenReturn(Optional.of(custom));
        when(taskRepository.findAllByStatus(custom)).thenReturn(List.of());

        org.assertj.core.api.Assertions.assertThatCode(
                        () -> service.deleteStatus("project-sys", 13L))
                .doesNotThrowAnyException();
        verify(taskStatusRepository).delete(custom);
    }
}
