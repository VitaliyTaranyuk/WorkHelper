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
import ru.worktechlab.work_task.repositories.MeetingRepository;
import ru.worktechlab.work_task.repositories.NotificationRepository;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MeetingReminderSchedulerTest {

    @Mock private MeetingRepository meetingRepository;
    @Mock private NotificationRepository notificationRepository;

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

    private Meeting meeting(String id, String link) {
        Meeting meeting = new Meeting(project, "Планёрка", null,
                LocalDateTime.now().plusMinutes(10), null, creator);
        ReflectionTestUtils.setField(meeting, "id", id);
        meeting.setLink(link);
        meeting.setParticipants(List.of(participant));
        return meeting;
    }

    @Test
    void sendDueReminders_shouldCarryMeetingIdProjectIdAndLink() {
        Meeting due = meeting("meeting-1", "https://telemost.yandex.ru/j/123");
        when(meetingRepository.findDueReminders(any(), any())).thenReturn(List.of(due));

        scheduler.sendDueReminders();

        ArgumentCaptor<Notification> captor = ArgumentCaptor.forClass(Notification.class);
        verify(notificationRepository).save(captor.capture());
        Notification n = captor.getValue();
        assertThat(n.getRecipient()).isEqualTo(participant);
        assertThat(n.getType()).isEqualTo(MeetingReminderScheduler.TYPE_MEETING_REMINDER);
        assertThat(n.getMeetingId()).isEqualTo("meeting-1");
        assertThat(n.getProjectId()).isEqualTo("project-1");
        assertThat(n.getLink()).isEqualTo("https://telemost.yandex.ru/j/123");
        assertThat(due.isReminderSent()).isTrue();
    }

    @Test
    void sendDueReminders_withoutLink_shouldStillReferenceMeeting() {
        Meeting due = meeting("meeting-2", null);
        when(meetingRepository.findDueReminders(any(), any())).thenReturn(List.of(due));

        scheduler.sendDueReminders();

        ArgumentCaptor<Notification> captor = ArgumentCaptor.forClass(Notification.class);
        verify(notificationRepository).save(captor.capture());
        Notification n = captor.getValue();
        assertThat(n.getLink()).isNull();
        assertThat(n.getMeetingId()).isEqualTo("meeting-2");
        assertThat(n.getProjectId()).isEqualTo("project-1");
    }

    @Test
    void sendDueReminders_shouldDoNothing_whenNoDueMeetings() {
        when(meetingRepository.findDueReminders(any(), any())).thenReturn(List.of());

        scheduler.sendDueReminders();

        verifyNoInteractions(notificationRepository);
    }
}
