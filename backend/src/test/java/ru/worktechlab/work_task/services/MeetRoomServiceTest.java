package ru.worktechlab.work_task.services;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import ru.worktechlab.work_task.TestFixtures;
import ru.worktechlab.work_task.authorization.jwt.JwtUtils;
import ru.worktechlab.work_task.config.MeetProperties;
import ru.worktechlab.work_task.dto.UserAndProjectData;
import ru.worktechlab.work_task.dto.meet.CreateMeetRoomRequest;
import ru.worktechlab.work_task.dto.meet.IceServersResponse;
import ru.worktechlab.work_task.dto.meet.MeetRoomDto;
import ru.worktechlab.work_task.exceptions.BadRequestException;
import ru.worktechlab.work_task.exceptions.NotFoundException;
import ru.worktechlab.work_task.models.tables.MeetRoom;
import ru.worktechlab.work_task.models.tables.Meeting;
import ru.worktechlab.work_task.models.tables.Project;
import ru.worktechlab.work_task.models.tables.User;
import ru.worktechlab.work_task.repositories.MeetRoomRepository;
import ru.worktechlab.work_task.repositories.MeetingRepository;
import ru.worktechlab.work_task.repositories.TaskRepository;
import ru.worktechlab.work_task.utils.CheckerUtil;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * ТП-161 (WorkTask Meet): комната создаётся с неугадываемым токеном в рамках
 * проекта; резолв проверяет членство; создание из встречи/задачи идемпотентно;
 * ICE-конфигурация — STUN по умолчанию, TURN только при заданном env.
 */
@ExtendWith(MockitoExtension.class)
class MeetRoomServiceTest {

    @Mock private MeetRoomRepository meetRoomRepository;
    @Mock private MeetingRepository meetingRepository;
    @Mock private TaskRepository taskRepository;
    @Mock private CheckerUtil checkerUtil;
    @Mock private JwtUtils jwtUtils;
    @Mock private MeetProperties meetProperties;

    @InjectMocks
    private MeetRoomService service;

    private User user;
    private Project project;

    @BeforeEach
    void setUp() {
        user = TestFixtures.ownerUser("user-1");
        project = TestFixtures.project("project-1", user);
    }

    private void givenMember() throws NotFoundException {
        when(checkerUtil.findAndCheckProjectUserData("project-1", false, false))
                .thenReturn(new UserAndProjectData(project, user));
    }

    @Test
    void createRoom_adhoc_generatesTokenAndDefaultTitle() throws Exception {
        givenMember();
        when(jwtUtils.generateSecureToken(32)).thenReturn("tok-random-43-chars");
        when(meetRoomRepository.saveAndFlush(any(MeetRoom.class))).thenAnswer(inv -> inv.getArgument(0));

        MeetRoomDto dto = service.createRoom("project-1", new CreateMeetRoomRequest());

        assertThat(dto.getToken()).isEqualTo("tok-random-43-chars");
        assertThat(dto.getTitle()).isEqualTo("Быстрая встреча");
        assertThat(dto.getProjectId()).isEqualTo("project-1");
        verify(meetRoomRepository).saveAndFlush(any(MeetRoom.class));
    }

    @Test
    void createRoom_fromMeeting_isIdempotent() throws Exception {
        givenMember();
        Meeting meeting = new Meeting(project, "Планёрка", null,
                LocalDateTime.now(), null, user);
        when(meetingRepository.findById("meeting-1")).thenReturn(Optional.of(meeting));
        MeetRoom existing = new MeetRoom(project, "tok-existing", "Планёрка",
                meeting.getId(), null, user);
        when(meetRoomRepository.findFirstByMeetingIdAndEndedAtIsNull(meeting.getId()))
                .thenReturn(Optional.of(existing));

        CreateMeetRoomRequest request = new CreateMeetRoomRequest("meeting-1", null, null);
        MeetRoomDto dto = service.createRoom("project-1", request);

        assertThat(dto.getToken()).isEqualTo("tok-existing");
        verify(meetRoomRepository, never()).saveAndFlush(any());
    }

    @Test
    void createRoom_meetingFromOtherProject_isRejected() throws Exception {
        givenMember();
        Project other = TestFixtures.project("project-2", user);
        Meeting foreign = new Meeting(other, "Чужая", null, LocalDateTime.now(), null, user);
        when(meetingRepository.findById("meeting-2")).thenReturn(Optional.of(foreign));

        assertThatThrownBy(() -> service.createRoom("project-1",
                new CreateMeetRoomRequest("meeting-2", null, null)))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("другому проекту");
    }

    @Test
    void resolveByToken_checksProjectMembership() throws Exception {
        MeetRoom room = new MeetRoom(project, "tok-1", "Планёрка", null, null, user);
        when(meetRoomRepository.findByToken("tok-1")).thenReturn(Optional.of(room));
        when(checkerUtil.findAndCheckProjectUserData("project-1", false, false))
                .thenThrow(new NotFoundException("Вам не доступен проект"));

        assertThatThrownBy(() -> service.resolveByToken("tok-1"))
                .isInstanceOf(NotFoundException.class)
                .hasMessageContaining("не доступен");
    }

    @Test
    void resolveByToken_unknownToken_notFound() {
        when(meetRoomRepository.findByToken("nope")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.resolveByToken("nope"))
                .isInstanceOf(NotFoundException.class)
                .hasMessageContaining("недействительна");
    }

    @Test
    void resolveByToken_endedRoom_rejected() {
        MeetRoom room = new MeetRoom(project, "tok-1", "Планёрка", null, null, user);
        room.end();
        when(meetRoomRepository.findByToken("tok-1")).thenReturn(Optional.of(room));

        assertThatThrownBy(() -> service.resolveByToken("tok-1"))
                .isInstanceOf(NotFoundException.class)
                .hasMessageContaining("завершена");
    }

    @Test
    void iceServers_defaultIsStunOnly() {
        when(meetProperties.stunUrlList()).thenReturn(java.util.List.of("stun:stun.l.google.com:19302"));
        when(meetProperties.turnUrlList()).thenReturn(java.util.List.of());

        IceServersResponse response = service.iceServers();

        assertThat(response.getIceServers()).hasSize(1);
        assertThat(response.getIceServers().get(0).getUrls())
                .containsExactly("stun:stun.l.google.com:19302");
        assertThat(response.getIceServers().get(0).getUsername()).isNull();
    }

    @Test
    void iceServers_turnFromEnvIsAppended() {
        when(meetProperties.stunUrlList()).thenReturn(java.util.List.of("stun:s"));
        when(meetProperties.turnUrlList()).thenReturn(java.util.List.of("turn:t:3478"));
        when(meetProperties.getTurnUsername()).thenReturn("u");
        when(meetProperties.getTurnCredential()).thenReturn("c");

        IceServersResponse response = service.iceServers();

        assertThat(response.getIceServers()).hasSize(2);
        assertThat(response.getIceServers().get(1).getUrls()).containsExactly("turn:t:3478");
        assertThat(response.getIceServers().get(1).getUsername()).isEqualTo("u");
        assertThat(response.getIceServers().get(1).getCredential()).isEqualTo("c");
    }
}
