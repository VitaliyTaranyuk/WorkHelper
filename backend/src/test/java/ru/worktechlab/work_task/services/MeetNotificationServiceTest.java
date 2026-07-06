package ru.worktechlab.work_task.services;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import ru.worktechlab.work_task.TestFixtures;
import ru.worktechlab.work_task.models.tables.MeetRoom;
import ru.worktechlab.work_task.models.tables.Meeting;
import ru.worktechlab.work_task.models.tables.Notification;
import ru.worktechlab.work_task.models.tables.Project;
import ru.worktechlab.work_task.models.tables.User;
import ru.worktechlab.work_task.models.tables.UserSettings;
import ru.worktechlab.work_task.repositories.MeetRoomRepository;
import ru.worktechlab.work_task.repositories.MeetingRepository;
import ru.worktechlab.work_task.repositories.NotificationRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * M5 (ТП-165): «встреча началась» — первый вошедший триггерит уведомление
 * участникам календарной встречи; вошедший исключается; настройка
 * notifyMeetings уважается; повторный старт в течение 10 минут не спамит;
 * быстрая комната без встречи — тишина.
 */
@ExtendWith(MockitoExtension.class)
class MeetNotificationServiceTest {

    @Mock private MeetRoomRepository meetRoomRepository;
    @Mock private MeetingRepository meetingRepository;
    @Mock private NotificationRepository notificationRepository;
    @Mock private UserSettingsService userSettingsService;

    @InjectMocks
    private MeetNotificationService service;

    private User creator;
    private User participant;
    private Project project;
    private Meeting meeting;
    private MeetRoom room;

    @BeforeEach
    void setUp() {
        creator = TestFixtures.ownerUser("creator-1");
        participant = TestFixtures.user("user-2", "u2@mail.ru");
        project = TestFixtures.project("project-1", creator);
        meeting = new Meeting(project, "Планёрка", null, LocalDateTime.now(), null, creator);
        meeting.setParticipants(List.of(creator, participant));
        meeting.setLink("https://host/meet/tok");
        room = new MeetRoom(project, "tok", "Планёрка", "meeting-1", null, creator);
    }

    private void givenRoomAndMeeting() {
        when(meetRoomRepository.findByToken("tok")).thenReturn(Optional.of(room));
        when(meetingRepository.findById("meeting-1")).thenReturn(Optional.of(meeting));
    }

    private void allowNotifications(String userId) {
        UserSettings settings = mock(UserSettings.class);
        when(settings.isNotifyMeetings()).thenReturn(true);
        when(userSettingsService.effectiveFor(userId)).thenReturn(settings);
    }

    @Test
    void firstJoiner_notifiesOtherParticipants_excludingJoiner() {
        givenRoomAndMeeting();
        allowNotifications("user-2");

        service.notifyMeetingStarted("tok", "creator-1");

        // Уведомление ушло только второму участнику (вошедший исключён)
        verify(notificationRepository, times(1)).save(any(Notification.class));
        verify(userSettingsService, never()).effectiveFor("creator-1");
    }

    @Test
    void repeatedStart_within10Minutes_isSilent() {
        givenRoomAndMeeting();
        allowNotifications("user-2");

        service.notifyMeetingStarted("tok", "creator-1");
        service.notifyMeetingStarted("tok", "creator-1");

        verify(notificationRepository, times(1)).save(any(Notification.class));
    }

    @Test
    void participantWithDisabledMeetingNotifications_isSkipped() {
        givenRoomAndMeeting();
        UserSettings off = mock(UserSettings.class);
        when(off.isNotifyMeetings()).thenReturn(false);
        when(userSettingsService.effectiveFor("user-2")).thenReturn(off);

        service.notifyMeetingStarted("tok", "creator-1");

        verify(notificationRepository, never()).save(any());
    }

    @Test
    void adhocRoomWithoutMeeting_isSilent() {
        MeetRoom adhoc = new MeetRoom(project, "tok2", "Быстрая встреча", null, null, creator);
        when(meetRoomRepository.findByToken("tok2")).thenReturn(Optional.of(adhoc));

        service.notifyMeetingStarted("tok2", "creator-1");

        verifyNoInteractions(meetingRepository, notificationRepository);
    }
}
