package ru.worktechlab.work_task.services;

import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import ru.worktechlab.work_task.TestFixtures;
import ru.worktechlab.work_task.dto.UserAndProjectData;
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

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
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
        when(sprintsService.findSprintByIdAndProject("sprint-1", project)).thenReturn(sprint);
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
}
