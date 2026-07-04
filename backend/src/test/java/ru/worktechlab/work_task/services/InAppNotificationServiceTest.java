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
import ru.worktechlab.work_task.models.tables.User;
import ru.worktechlab.work_task.repositories.NotificationRepository;
import ru.worktechlab.work_task.repositories.UserRepository;
import ru.worktechlab.work_task.utils.UserContext;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class InAppNotificationServiceTest {

    @Mock private NotificationRepository notificationRepository;
    @Mock private UserRepository userRepository;
    @Mock private UserContext userContext;
    @Mock private UserSettingsService userSettingsService;

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
        assertThat(n.getMessage()).contains(task.getCode());
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
}
