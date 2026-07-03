package ru.worktechlab.work_task.services;

import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import ru.worktechlab.work_task.TestFixtures;
import org.mockito.ArgumentCaptor;
import org.springframework.test.util.ReflectionTestUtils;
import ru.worktechlab.work_task.dto.UserAndProjectData;
import ru.worktechlab.work_task.dto.tasks.BulkTaskRequestDTO;
import ru.worktechlab.work_task.dto.task_comment.CommentDto;
import ru.worktechlab.work_task.dto.task_comment.CommentResponseDto;
import ru.worktechlab.work_task.dto.task_link.LinkDto;
import ru.worktechlab.work_task.dto.tasks.TaskDataDto;
import ru.worktechlab.work_task.dto.tasks.TaskModelDTO;
import ru.worktechlab.work_task.exceptions.DuplicateLinkException;
import ru.worktechlab.work_task.exceptions.NotFoundException;
import ru.worktechlab.work_task.mappers.CommentMapper;
import ru.worktechlab.work_task.mappers.LinkMapper;
import ru.worktechlab.work_task.mappers.TaskMapper;
import ru.worktechlab.work_task.models.tables.*;
import ru.worktechlab.work_task.repositories.CommentRepository;
import ru.worktechlab.work_task.repositories.LinkRepository;
import ru.worktechlab.work_task.repositories.TaskRepository;
import ru.worktechlab.work_task.utils.CheckerUtil;
import ru.worktechlab.work_task.utils.UserContext;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TaskServiceTest {

    @Mock private TaskRepository taskRepository;
    @Mock private UserService userService;
    @Mock private ProjectsService projectsService;
    @Mock private UserContext userContext;
    @Mock private TaskHistoryService taskHistorySaverService;
    @Mock private SprintsService sprintsService;
    @Mock private TaskMapper taskMapper;
    @Mock private CheckerUtil checkerUtil;
    @Mock private CommentRepository commentRepository;
    @Mock private CommentMapper commentMapper;
    @Mock private LinkRepository linkRepository;
    @Mock private LinkMapper linkMapper;
    @Mock private InAppNotificationService inAppNotificationService;
    @Mock private TaskPlacementService taskPlacementService;

    @InjectMocks
    private TaskService taskService;

    private User creator;
    private Project project;
    private Sprint sprint;
    private TaskStatus defaultStatus;
    private TaskModel task;

    @BeforeEach
    void setUp() {
        creator = TestFixtures.ownerUser("user-1");
        project = TestFixtures.project("project-1", creator);
        sprint = TestFixtures.sprint("sprint-1", project, creator);
        defaultStatus = TestFixtures.defaultStatus(project);

        project.getStatuses().add(defaultStatus);
        creator.getProjects().add(project);

        task = TestFixtures.task("task-1", creator, project, sprint, defaultStatus);
    }

    @Test
    void findTaskByIdOrThrow_shouldReturnTask_whenFound() throws Exception {
        when(taskRepository.findById("task-1")).thenReturn(Optional.of(task));

        TaskModel result = taskService.findTaskByIdOrThrow("task-1");

        assertThat(result).isEqualTo(task);
    }

    @Test
    void findTaskByIdOrThrow_shouldThrowEntityNotFoundException_whenNotFound() throws Exception {
        when(taskRepository.findById("missing")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> taskService.findTaskByIdOrThrow("missing"))
                .isInstanceOf(EntityNotFoundException.class)
                .hasMessageContaining("missing");
    }

    @Test
    void findTaskByIdAndProject_shouldReturnTask_whenFound() throws Exception {
        when(taskRepository.findTaskModelByIdAndProject("task-1", project))
                .thenReturn(Optional.of(task));

        TaskModel result = taskService.findTaskByIdAndProject("task-1", project);

        assertThat(result).isEqualTo(task);
    }

    @Test
    void findTaskByIdAndProject_shouldThrowNotFoundException_whenNotFound() throws Exception {
        when(taskRepository.findTaskModelByIdAndProject("missing", project))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> taskService.findTaskByIdAndProject("missing", project))
                .isInstanceOf(NotFoundException.class);
    }

    @Test
    void createTask_shouldSaveTaskAndReturnDto() throws Exception {
        TaskModelDTO dto = buildCreateTaskDto();
        TaskDataDto expectedDto = mock(TaskDataDto.class);
        UserAndProjectData data = new UserAndProjectData(project, creator);

        when(checkerUtil.findAndCheckProjectUserData("project-1", false, false)).thenReturn(data);
        when(sprintsService.resolveSprintForTask("sprint-1", project)).thenReturn(sprint);
        when(taskPlacementService.initialStatusFor(sprint, project)).thenReturn(defaultStatus);
        when(taskRepository.saveAndFlush(any(TaskModel.class))).thenReturn(task);
        when(taskMapper.toDo(any(TaskModel.class))).thenReturn(expectedDto);

        TaskDataDto result = taskService.createTask(dto);

        assertThat(result).isEqualTo(expectedDto);
        verify(taskRepository).saveAndFlush(any(TaskModel.class));
    }

    @Test
    void createComment_shouldSaveCommentAndReturnDto() throws Exception {
        CommentDto dto = new CommentDto();
        dto.setProjectId("project-1");
        dto.setTaskId("task-1");
        dto.setComment("Great progress!");

        UserAndProjectData data = new UserAndProjectData(project, creator);
        CommentResponseDto expectedDto = mock(CommentResponseDto.class);

        when(checkerUtil.findAndCheckProjectUserData("project-1", false, false)).thenReturn(data);
        when(taskRepository.findTaskModelByIdAndProject("task-1", project)).thenReturn(Optional.of(task));
        when(commentRepository.saveAndFlush(any(Comment.class))).thenAnswer(inv -> inv.getArgument(0));
        when(commentMapper.toDto(any(Comment.class))).thenReturn(expectedDto);

        CommentResponseDto result = taskService.createComment(dto);

        assertThat(result).isEqualTo(expectedDto);
        verify(commentRepository).saveAndFlush(any(Comment.class));
    }

    @Test
    void deleteComment_shouldDeleteAndReturnSuccessMessage() throws Exception {
        Comment comment = new Comment(task, creator, "old comment");
        org.springframework.test.util.ReflectionTestUtils.setField(comment, "id", "comment-1");

        UserAndProjectData data = new UserAndProjectData(project, creator);

        when(checkerUtil.findAndCheckProjectUserData("project-1", false, false)).thenReturn(data);
        when(taskRepository.findTaskModelByIdAndProject("task-1", project)).thenReturn(Optional.of(task));
        when(commentRepository.findByCommentAndTaskAds("comment-1", task.getId())).thenReturn(Optional.of(comment));

        var response = taskService.deleteComment("comment-1", "task-1", "project-1");

        assertThat(response.getMessage()).contains("удалён");
        verify(commentRepository).deleteCommentById("comment-1");
    }

    @Test
    void deleteLink_shouldDelete_whenLinkBelongsToProject() throws Exception {
        TaskModel target = TestFixtures.task("task-2", creator, project, sprint, defaultStatus);
        Link link = new Link(task, target, ru.worktechlab.work_task.models.enums.LinkTypeName.BLOCKS);
        ReflectionTestUtils.setField(link, "id", "link-1");
        UserAndProjectData data = new UserAndProjectData(project, creator);
        when(checkerUtil.findAndCheckProjectUserData("project-1", false, false)).thenReturn(data);
        when(linkRepository.findById("link-1")).thenReturn(Optional.of(link));

        var response = taskService.deleteLink("project-1", "link-1");

        assertThat(response.getMessage()).contains("удалена");
        verify(linkRepository).delete(link);
    }

    @Test
    void deleteLink_shouldThrowNotFound_whenLinkMissing() throws Exception {
        UserAndProjectData data = new UserAndProjectData(project, creator);
        when(checkerUtil.findAndCheckProjectUserData("project-1", false, false)).thenReturn(data);
        when(linkRepository.findById("missing")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> taskService.deleteLink("project-1", "missing"))
                .isInstanceOf(NotFoundException.class);
    }

    @Test
    void deleteLink_shouldThrowNotFound_whenLinkFromAnotherProject() throws Exception {
        Project other = TestFixtures.project("project-2", creator);
        TaskModel foreignA = TestFixtures.task("task-8", creator, other, sprint, defaultStatus);
        TaskModel foreignB = TestFixtures.task("task-9", creator, other, sprint, defaultStatus);
        Link link = new Link(foreignA, foreignB, ru.worktechlab.work_task.models.enums.LinkTypeName.RELATED);
        ReflectionTestUtils.setField(link, "id", "link-2");
        UserAndProjectData data = new UserAndProjectData(project, creator);
        when(checkerUtil.findAndCheckProjectUserData("project-1", false, false)).thenReturn(data);
        when(linkRepository.findById("link-2")).thenReturn(Optional.of(link));

        assertThatThrownBy(() -> taskService.deleteLink("project-1", "link-2"))
                .isInstanceOf(NotFoundException.class);
        verify(linkRepository, never()).delete(any(Link.class));
    }

    @Test
    void linkTask_shouldThrowDuplicateLinkException_whenLinkAlreadyExists() throws Exception {
        TaskModel target = TestFixtures.task("task-2", creator, project, sprint, defaultStatus);
        Link existingLink = mock(Link.class);

        LinkDto dto = new LinkDto();
        dto.setProjectId("project-1");
        dto.setTaskIdSource("task-1");
        dto.setTaskIdTarget("task-2");
        dto.setLinkTypeName("BLOCKS");

        UserAndProjectData data = new UserAndProjectData(project, creator);

        when(checkerUtil.findAndCheckProjectUserData("project-1", false, false)).thenReturn(data);
        when(taskRepository.findTaskModelByIdAndProject("task-1", project)).thenReturn(Optional.of(task));
        when(taskRepository.findTaskModelByIdAndProject("task-2", project)).thenReturn(Optional.of(target));
        when(linkRepository.findByTasksLinkedAndType(any(), any(), any())).thenReturn(Optional.of(existingLink));

        assertThatThrownBy(() -> taskService.linkTask(dto))
                .isInstanceOf(DuplicateLinkException.class)
                .hasMessageContaining("уже существует");
    }

    private TaskModelDTO buildCreateTaskDto() {
        TaskModelDTO dto = new TaskModelDTO();
        dto.setProjectId("project-1");
        dto.setSprintId("sprint-1");
        dto.setTitle("New Task");
        dto.setDescription("Description");
        dto.setPriority("HIGH");
        dto.setTaskType("STORY");
        dto.setEstimation(5);
        return dto;
    }

    // ===== Simplified Kanban: lifecycle / bulk / my-tasks =====

    @Test
    void archiveTask_shouldSetArchivedAndCompletedDate() throws Exception {
        UserAndProjectData data = new UserAndProjectData(project, creator);
        when(checkerUtil.findAndCheckProjectUserData("project-1", false, false)).thenReturn(data);
        when(taskRepository.findTaskModelByIdAndProjectForUpdate("task-1", "project-1")).thenReturn(Optional.of(task));
        when(taskRepository.findById("task-1")).thenReturn(Optional.of(task));
        when(taskMapper.toDo(task)).thenReturn(mock(TaskDataDto.class));

        taskService.archiveTask("project-1", "task-1");

        assertThat(task.isArchived()).isTrue();
        assertThat(task.getCompletedDate()).isNotNull();
    }

    @Test
    void restoreTask_shouldClearArchivedFlag() throws Exception {
        task.setArchived(true);
        UserAndProjectData data = new UserAndProjectData(project, creator);
        when(checkerUtil.findAndCheckProjectUserData("project-1", false, false)).thenReturn(data);
        when(taskRepository.findTaskModelByIdAndProjectForUpdate("task-1", "project-1")).thenReturn(Optional.of(task));
        when(taskRepository.findById("task-1")).thenReturn(Optional.of(task));
        when(taskMapper.toDo(task)).thenReturn(mock(TaskDataDto.class));

        taskService.restoreTask("project-1", "task-1");

        assertThat(task.isArchived()).isFalse();
    }

    @Test
    void deleteTask_shouldRemoveLinksAndTask() throws Exception {
        UserAndProjectData data = new UserAndProjectData(project, creator);
        when(checkerUtil.findAndCheckProjectUserData("project-1", false, false)).thenReturn(data);
        when(taskRepository.findTaskModelByIdAndProject("task-1", project)).thenReturn(Optional.of(task));
        when(linkRepository.findLinksByTaskId("task-1")).thenReturn(List.of());

        taskService.deleteTask("project-1", "task-1");

        verify(taskRepository).delete(task);
    }

    @Test
    void getMyTasks_shouldReturnOnlyCurrentUserNonArchivedTasks() throws Exception {
        UserContext realCtx = new UserContext();
        UserContext.UserContextData ctx = TestFixtures.contextData(realCtx, "user-1", "owner@test.com");
        when(userContext.getUserData()).thenReturn(ctx);
        UserAndProjectData data = new UserAndProjectData(project, creator);
        when(checkerUtil.findAndCheckProjectUserData("project-1", false, false)).thenReturn(data);

        ReflectionTestUtils.setField(task, "assignee", creator); // creator.id == user-1
        TaskModel othersTask = TestFixtures.task("task-2", creator, project, sprint, defaultStatus);
        ReflectionTestUtils.setField(othersTask, "assignee", TestFixtures.user("user-2", "u2@test.com"));
        TaskModel myArchived = TestFixtures.task("task-3", creator, project, sprint, defaultStatus);
        ReflectionTestUtils.setField(myArchived, "assignee", creator);
        myArchived.setArchived(true);
        project.getTasks().addAll(List.of(task, othersTask, myArchived));

        when(taskMapper.toDo(anyList())).thenReturn(List.of(mock(TaskDataDto.class)));

        taskService.getMyTasks("project-1");

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<TaskModel>> captor = ArgumentCaptor.forClass(List.class);
        verify(taskMapper).toDo(captor.capture());
        assertThat(captor.getValue()).containsExactly(task);
    }

    @Test
    void bulkMoveStatus_shouldMoveAllTasksToTargetStatus() throws Exception {
        UserAndProjectData data = new UserAndProjectData(project, creator);
        when(checkerUtil.findAndCheckProjectUserData("project-1", false, false)).thenReturn(data);
        TaskStatus target = TestFixtures.status("IN_PROGRESS", project);
        ReflectionTestUtils.setField(target, "id", 7L);
        project.getStatuses().add(target);
        when(taskRepository.findTaskModelByIdAndProject("task-1", project)).thenReturn(Optional.of(task));
        // placement-сервис применяет смену статуса (инвариант статус↔спринт покрыт в TaskPlacementServiceTest)
        doAnswer(inv -> {
            ((TaskModel) inv.getArgument(0)).setStatus(inv.getArgument(1));
            return null;
        }).when(taskPlacementService).applyStatusChange(any(TaskModel.class), any(TaskStatus.class), any(Project.class));

        BulkTaskRequestDTO dto = new BulkTaskRequestDTO();
        dto.setProjectId("project-1");
        dto.setTaskIds(List.of("task-1"));
        dto.setStatusId(7L);

        taskService.bulkMoveStatus(dto);

        assertThat(task.getStatus()).isEqualTo(target);
    }

    @Test
    void bulkMoveStatus_shouldThrow_whenStatusIdMissing() {
        BulkTaskRequestDTO dto = new BulkTaskRequestDTO();
        dto.setProjectId("project-1");
        dto.setTaskIds(List.of("task-1"));

        assertThatThrownBy(() -> taskService.bulkMoveStatus(dto))
                .isInstanceOf(NotFoundException.class);
    }
}
