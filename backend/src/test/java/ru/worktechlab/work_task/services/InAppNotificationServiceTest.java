package ru.worktechlab.work_task.services;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import ru.worktechlab.work_task.TestFixtures;
import ru.worktechlab.work_task.models.tables.Notification;
import ru.worktechlab.work_task.models.tables.Project;
import ru.worktechlab.work_task.models.tables.TaskModel;
import ru.worktechlab.work_task.models.tables.TaskStatus;
import ru.worktechlab.work_task.models.tables.User;
import ru.worktechlab.work_task.dto.notifications.NotificationDto;
import ru.worktechlab.work_task.repositories.NotificationRepository;
import ru.worktechlab.work_task.repositories.TaskRepository;
import ru.worktechlab.work_task.repositories.UserRepository;
import ru.worktechlab.work_task.utils.UserContext;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class InAppNotificationServiceTest {

    @Mock private NotificationRepository notificationRepository;
    @Mock private UserRepository userRepository;
    @Mock private UserContext userContext;
    @Mock private UserSettingsService userSettingsService;
    @Mock private TaskRepository taskRepository;
    @Mock private TaskPlacementService taskPlacementService;

    @InjectMocks
    private InAppNotificationService service;

    private User actor;
    private User mentioned;
    private TaskModel task;

    @BeforeEach
    void setUp() {
        actor = TestFixtures.ownerUser("actor-1");
        ReflectionTestUtils.setField(actor, "username", "ivanov");
        mentioned = TestFixtures.user("user-2", "petrov@test.com");
        ReflectionTestUtils.setField(mentioned, "username", "petrov");
        Project project = TestFixtures.project("project-1", actor);
        task = TestFixtures.task("task-1", actor, project,
                TestFixtures.sprint("sprint-1", project, actor), TestFixtures.defaultStatus(project));
    }

    @Test
    void createMentionNotifications_shouldCreateNotificationForMentionedUser() {
        when(userRepository.findByUsername("petrov")).thenReturn(Optional.of(mentioned));
        when(userSettingsService.effectiveFor("user-2"))
                .thenReturn(new ru.worktechlab.work_task.models.tables.UserSettings("user-2"));

        service.createMentionNotifications("эй @petrov глянь", actor, task, "comment-1");

        ArgumentCaptor<Notification> captor = ArgumentCaptor.forClass(Notification.class);
        verify(notificationRepository).save(captor.capture());
        Notification n = captor.getValue();
        assertThat(n.getRecipient()).isEqualTo(mentioned);
        assertThat(n.getActor()).isEqualTo(actor);
        assertThat(n.getType()).isEqualTo(InAppNotificationService.TYPE_MENTION);
        assertThat(n.getTaskId()).isEqualTo("task-1");
    }

    @Test
    void createMentionNotifications_shouldNotNotifySelf() {
        when(userRepository.findByUsername("ivanov")).thenReturn(Optional.of(actor));

        service.createMentionNotifications("сам себе @ivanov", actor, task, "comment-1");

        verify(notificationRepository, never()).save(any());
    }

    @Test
    void createTaskCreatedNotification_shouldNotifyCreatorWithTaskLink() {
        when(userSettingsService.effectiveFor("actor-1"))
                .thenReturn(new ru.worktechlab.work_task.models.tables.UserSettings("actor-1"));

        service.createTaskCreatedNotification(actor, task);

        ArgumentCaptor<Notification> captor = ArgumentCaptor.forClass(Notification.class);
        verify(notificationRepository).save(captor.capture());
        Notification n = captor.getValue();
        assertThat(n.getRecipient()).isEqualTo(actor);
        assertThat(n.getType()).isEqualTo(InAppNotificationService.TYPE_TASK_CREATED);
        // ТП-72: текст — только название задачи; тип и код фронтенд рендерит из
        // структурных полей заголовка, поэтому в сообщении их больше нет.
        assertThat(n.getMessage()).isEqualTo(task.getTitle());
        // taskCode обязателен: по нему фронтенд делает уведомление кликабельным
        assertThat(n.getTaskCode()).isEqualTo(task.getCode());
        assertThat(n.getTaskId()).isEqualTo("task-1");
    }

    @Test
    void createMentionNotifications_shouldDoNothing_whenNoMentions() {
        service.createMentionNotifications("обычный комментарий без упоминаний", actor, task, "comment-1");

        verify(notificationRepository, never()).save(any());
        verifyNoInteractions(userRepository);
    }

    // ТП-83: состояние задачи в DTO уведомления вычисляется на лету по статусу.
    private NotificationDto firstDtoForTaskWithStatus(TaskStatus status, Optional<TaskStatus> completed) {
        Project project = TestFixtures.project("project-1", actor);
        TaskModel t = TestFixtures.task("task-1", actor, project,
                TestFixtures.sprint("sprint-1", project, actor), status);
        Notification n = new Notification(actor, actor, InAppNotificationService.TYPE_TASK_CREATED,
                "Задача", "task-1", "TP-1", null);

        UserContext.UserContextData ucd = mock(UserContext.UserContextData.class);
        when(ucd.getUserId()).thenReturn("actor-1");
        when(userContext.getUserData()).thenReturn(ucd);
        when(notificationRepository.findByRecipientIdOrderByCreatedAtDesc("actor-1")).thenReturn(List.of(n));
        when(taskRepository.findAllById(anySet())).thenReturn(List.of(t));
        when(taskPlacementService.completedBoardStatus(any())).thenReturn(completed);

        List<NotificationDto> dtos = service.getMyNotifications();
        assertThat(dtos).hasSize(1);
        return dtos.get(0);
    }

    @Test
    void getMyNotifications_taskCreated_shouldReflectDoneState() {
        TaskStatus done = new TaskStatus(6, "Done", "Done", true, false, true, null);
        ReflectionTestUtils.setField(done, "id", 4L);
        NotificationDto dto = firstDtoForTaskWithStatus(done, Optional.of(done));
        assertThat(dto.getTaskState()).isEqualTo(InAppNotificationService.TASK_STATE_DONE);
    }

    @Test
    void getMyNotifications_taskCreated_shouldReflectCanceledState() {
        TaskStatus done = new TaskStatus(6, "Done", "Done", true, false, true, null);
        ReflectionTestUtils.setField(done, "id", 4L);
        // Отменённая = скрытая колонка (viewed=false), не совпадает с завершающей.
        TaskStatus canceled = new TaskStatus(5, "Canceled", "Canceled", false, false, true, null);
        ReflectionTestUtils.setField(canceled, "id", 5L);
        NotificationDto dto = firstDtoForTaskWithStatus(canceled, Optional.of(done));
        assertThat(dto.getTaskState()).isEqualTo(InAppNotificationService.TASK_STATE_CANCELED);
    }

    @Test
    void getMyNotifications_taskCreated_shouldReflectActiveState() {
        TaskStatus done = new TaskStatus(6, "Done", "Done", true, false, true, null);
        ReflectionTestUtils.setField(done, "id", 4L);
        // Активная = видимая колонка, не завершающая (например «To Do»).
        TaskStatus todo = new TaskStatus(1, "To Do", "To Do", true, true, true, null);
        ReflectionTestUtils.setField(todo, "id", 1L);
        NotificationDto dto = firstDtoForTaskWithStatus(todo, Optional.of(done));
        assertThat(dto.getTaskState()).isEqualTo(InAppNotificationService.TASK_STATE_ACTIVE);
    }
}
