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
import ru.worktechlab.work_task.models.tables.Meeting;
import ru.worktechlab.work_task.models.tables.Notification;
import ru.worktechlab.work_task.models.tables.Project;
import ru.worktechlab.work_task.models.tables.User;
import ru.worktechlab.work_task.models.tables.UserSettings;
import ru.worktechlab.work_task.repositories.MeetingReminderLogRepository;
import ru.worktechlab.work_task.repositories.MeetingRepository;
import ru.worktechlab.work_task.repositories.NotificationRepository;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MeetingReminderSchedulerTest {

    @Mock private MeetingRepository meetingRepository;
    @Mock private NotificationRepository notificationRepository;
    @Mock private MeetingReminderLogRepository reminderLogRepository;
    @Mock private UserSettingsService userSettingsService;

    @InjectMocks
    private MeetingReminderScheduler scheduler;

    private User creator;
    private User participant;
    private Project project;

    @BeforeEach
    void setUp() {
        creator = TestFixtures.ownerUser("creator-1");
        participant = TestFixtures.user("user-2", "petrov@test.com");
        project = TestFixtures.project("project-1", creator);
    }

    private Meeting meeting(String id, String link, int minutesUntilStart) {
        Meeting meeting = new Meeting(project, "Планёрка", null,
                LocalDateTime.now().plusMinutes(minutesUntilStart), null, creator);
        ReflectionTestUtils.setField(meeting, "id", id);
        meeting.setLink(link);
        meeting.setParticipants(List.of(participant));
        return meeting;
    }

    @Test
    void sendDueReminders_shouldCarryMeetingIdProjectIdAndLink() {
        // Встреча через 10 минут, дефолтное окно 15 → входит в окно напоминания
        Meeting due = meeting("meeting-1", "https://telemost.yandex.ru/j/123", 10);
        when(meetingRepository.findUpcoming(any(), any())).thenReturn(List.of(due));
        when(userSettingsService.effectiveFor("user-2")).thenReturn(new UserSettings("user-2"));
        when(reminderLogRepository.existsByMeetingIdAndUserId("meeting-1", "user-2")).thenReturn(false);

        scheduler.sendDueReminders();

        ArgumentCaptor<Notification> captor = ArgumentCaptor.forClass(Notification.class);
        verify(notificationRepository).save(captor.capture());
        Notification n = captor.getValue();
        assertThat(n.getRecipient()).isEqualTo(participant);
        assertThat(n.getType()).isEqualTo(MeetingReminderScheduler.TYPE_MEETING_REMINDER);
        assertThat(n.getMeetingId()).isEqualTo("meeting-1");
        assertThat(n.getProjectId()).isEqualTo("project-1");
        assertThat(n.getLink()).isEqualTo("https://telemost.yandex.ru/j/123");
        verify(reminderLogRepository).save(any());
    }

    @Test
    void sendDueReminders_shouldSkip_whenAlreadyLogged() {
        Meeting due = meeting("meeting-2", null, 10);
        when(meetingRepository.findUpcoming(any(), any())).thenReturn(List.of(due));
        when(userSettingsService.effectiveFor("user-2")).thenReturn(new UserSettings("user-2"));
        when(reminderLogRepository.existsByMeetingIdAndUserId("meeting-2", "user-2")).thenReturn(true);

        scheduler.sendDueReminders();

        verify(notificationRepository, never()).save(any());
    }

    @Test
    void sendDueReminders_shouldSkip_whenMeetingsDisabledInSettings() {
        Meeting due = meeting("meeting-3", null, 10);
        UserSettings off = new UserSettings("user-2");
        off.setNotifyMeetings(false);
        when(meetingRepository.findUpcoming(any(), any())).thenReturn(List.of(due));
        when(userSettingsService.effectiveFor("user-2")).thenReturn(off);

        scheduler.sendDueReminders();

        verify(notificationRepository, never()).save(any());
        verify(reminderLogRepository, never()).existsByMeetingIdAndUserId(anyString(), anyString());
    }

    @Test
    void sendDueReminders_shouldSkip_whenOutsideReminderWindow() {
        // Встреча через 40 минут, дефолтное окно 15 → ещё рано
        Meeting due = meeting("meeting-4", null, 40);
        when(meetingRepository.findUpcoming(any(), any())).thenReturn(List.of(due));
        when(userSettingsService.effectiveFor("user-2")).thenReturn(new UserSettings("user-2"));

        scheduler.sendDueReminders();

        verify(notificationRepository, never()).save(any());
    }

    @Test
    void sendDueReminders_shouldRespectCustomReminderMinutes() {
        // Встреча через 40 минут, окно пользователя 60 → пора напомнить
        Meeting due = meeting("meeting-5", null, 40);
        UserSettings wide = new UserSettings("user-2");
        wide.setReminderMinutes(60);
        when(meetingRepository.findUpcoming(any(), any())).thenReturn(List.of(due));
        when(userSettingsService.effectiveFor("user-2")).thenReturn(wide);
        when(reminderLogRepository.existsByMeetingIdAndUserId("meeting-5", "user-2")).thenReturn(false);

        scheduler.sendDueReminders();

        verify(notificationRepository).save(any());
    }

    @Test
    void sendDueReminders_shouldDoNothing_whenNoUpcomingMeetings() {
        when(meetingRepository.findUpcoming(any(), any())).thenReturn(List.of());

        scheduler.sendDueReminders();

        verifyNoInteractions(notificationRepository);
    }
}
