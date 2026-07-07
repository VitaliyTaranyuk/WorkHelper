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
import ru.worktechlab.work_task.dto.monitoring.MonitoringWebhookDto;
import ru.worktechlab.work_task.exceptions.PermissionDeniedException;
import ru.worktechlab.work_task.models.tables.Notification;
import ru.worktechlab.work_task.models.tables.Project;
import ru.worktechlab.work_task.models.tables.User;
import ru.worktechlab.work_task.repositories.NotificationRepository;
import ru.worktechlab.work_task.repositories.ProjectRepository;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * ТП-175: вебхук алертов мониторинга — токен-гейт (пустой конфиг = приём
 * выключен; неверный токен = 403), доставка всем участникам проекта,
 * заголовок issue и ссылка переносятся в уведомление, длинный текст режется.
 */
@ExtendWith(MockitoExtension.class)
class MonitoringAlertServiceTest {

    @Mock private NotificationRepository notificationRepository;
    @Mock private ProjectRepository projectRepository;

    @InjectMocks
    private MonitoringAlertService service;

    private Project project;
    private User owner;
    private User member;

    @BeforeEach
    void setUp() {
        owner = TestFixtures.ownerUser("owner-1");
        member = TestFixtures.user("user-2", "u2@mail.ru");
        project = TestFixtures.project("project-1", owner);
        project.getUsers().addAll(List.of(owner, member));
        ReflectionTestUtils.setField(service, "webhookToken", "s3cret");
        ReflectionTestUtils.setField(service, "projectId", "project-1");
    }

    private MonitoringWebhookDto payload(String title, String link) {
        return new MonitoringWebhookDto("GlitchTip", "GlitchTip Alert",
                List.of(new MonitoringWebhookDto.Attachment(title, link, "culprit")));
    }

    @Test
    void alertCreatesNotificationForEveryProjectMember() {
        when(projectRepository.findById("project-1")).thenReturn(Optional.of(project));

        service.acceptAlert("s3cret", payload("TypeError: x is not a function", "https://mon/issues/1"));

        ArgumentCaptor<Notification> captor = ArgumentCaptor.forClass(Notification.class);
        verify(notificationRepository, org.mockito.Mockito.times(2)).save(captor.capture());
        List<Notification> saved = captor.getAllValues();
        assertThat(saved).extracting(n -> n.getRecipient().getId())
                .containsExactlyInAnyOrder("owner-1", "user-2");
        assertThat(saved.get(0).getType()).isEqualTo(MonitoringAlertService.TYPE_MONITORING_ALERT);
        assertThat(saved.get(0).getMessage()).isEqualTo("TypeError: x is not a function");
        assertThat(saved.get(0).getLink()).isEqualTo("https://mon/issues/1");
    }

    @Test
    void wrongTokenIsRejected() {
        assertThatThrownBy(() -> service.acceptAlert("wrong", payload("t", null)))
                .isInstanceOf(PermissionDeniedException.class);
        verify(notificationRepository, never()).save(org.mockito.ArgumentMatchers.any());
    }

    @Test
    void blankConfiguredTokenDisablesEndpointEvenForBlankRequestToken() {
        ReflectionTestUtils.setField(service, "webhookToken", "");
        assertThatThrownBy(() -> service.acceptAlert("", payload("t", null)))
                .isInstanceOf(PermissionDeniedException.class);
        verify(notificationRepository, never()).save(org.mockito.ArgumentMatchers.any());
    }

    @Test
    void missingProjectConfigIsGracefulNoop() {
        ReflectionTestUtils.setField(service, "projectId", "");
        service.acceptAlert("s3cret", payload("t", null));
        verify(notificationRepository, never()).save(org.mockito.ArgumentMatchers.any());
    }

    @Test
    void fallsBackToTextWithoutAttachmentsAndTruncatesLongMessage() {
        when(projectRepository.findById("project-1")).thenReturn(Optional.of(project));
        String longText = "x".repeat(600);
        MonitoringWebhookDto dto = new MonitoringWebhookDto("GlitchTip", longText, null);

        service.acceptAlert("s3cret", dto);

        ArgumentCaptor<Notification> captor = ArgumentCaptor.forClass(Notification.class);
        verify(notificationRepository, org.mockito.Mockito.times(2)).save(captor.capture());
        assertThat(captor.getValue().getMessage()).hasSize(512).endsWith("…");
        assertThat(captor.getValue().getLink()).isNull();
    }
}
