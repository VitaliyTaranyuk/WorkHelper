package ru.worktechlab.work_task.services;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import ru.worktechlab.work_task.TestFixtures;
import ru.worktechlab.work_task.dto.UserAndProjectData;
import ru.worktechlab.work_task.models.tables.MeetRoom;
import ru.worktechlab.work_task.models.tables.Meeting;
import ru.worktechlab.work_task.models.tables.Project;
import ru.worktechlab.work_task.models.tables.User;
import ru.worktechlab.work_task.repositories.MeetRoomRepository;
import ru.worktechlab.work_task.repositories.MeetingRepository;
import ru.worktechlab.work_task.utils.CheckerUtil;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

/**
 * ТП-169 (ПЗ-1): удаление календарной встречи не оставляет «осиротевшую»
 * активную комнату Meet — комната закрывается, вход по старой ссылке даст
 * «Встреча завершена».
 */
@ExtendWith(MockitoExtension.class)
class MeetingServiceRoomCleanupTest {

    @Mock private MeetingRepository meetingRepository;
    @Mock private MeetRoomRepository meetRoomRepository;
    @Mock private CheckerUtil checkerUtil;

    @InjectMocks
    private MeetingService service;

    private User user;
    private Project project;
    private Meeting meeting;

    @BeforeEach
    void setUp() throws Exception {
        user = TestFixtures.ownerUser("u1");
        project = TestFixtures.project("p1", user);
        meeting = new Meeting(project, "Планёрка", null, LocalDateTime.now(), null, user);
        when(meetingRepository.findById("m1")).thenReturn(Optional.of(meeting));
        when(checkerUtil.findAndCheckProjectUserData("p1", false, false))
                .thenReturn(new UserAndProjectData(project, user));
    }

    @Test
    void deleteMeeting_closesActiveRoom() throws Exception {
        MeetRoom room = new MeetRoom(project, "tok", "Планёрка", "m1", null, user);
        when(meetRoomRepository.findFirstByMeetingIdAndEndedAtIsNull("m1"))
                .thenReturn(Optional.of(room));

        service.deleteMeeting("m1");

        assertThat(room.getEndedAt()).isNotNull();
        verify(meetRoomRepository).save(room);
        verify(meetingRepository).delete(meeting);
    }

    @Test
    void deleteMeeting_withoutRoom_justDeletes() throws Exception {
        when(meetRoomRepository.findFirstByMeetingIdAndEndedAtIsNull("m1"))
                .thenReturn(Optional.empty());

        service.deleteMeeting("m1");

        verify(meetRoomRepository, never()).save(any());
        verify(meetingRepository).delete(meeting);
    }
}
