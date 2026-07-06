package ru.worktechlab.work_task.ws.meet;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import ru.worktechlab.work_task.TestFixtures;
import ru.worktechlab.work_task.authorization.jwt.JwtUtils;
import ru.worktechlab.work_task.config.MeetProperties;
import ru.worktechlab.work_task.exceptions.NotFoundException;
import ru.worktechlab.work_task.models.tables.MeetRoom;
import ru.worktechlab.work_task.models.tables.Project;
import ru.worktechlab.work_task.models.tables.User;
import ru.worktechlab.work_task.repositories.MeetRoomRepository;
import ru.worktechlab.work_task.utils.CheckerUtil;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

/**
 * ТП-162: авторизация WS-handshake — невалидный JWT и чужой проект
 * отклоняются, валидный участник получает полный контекст сессии.
 */
@ExtendWith(MockitoExtension.class)
class MeetAccessServiceTest {

    @Mock private JwtUtils jwtUtils;
    @Mock private MeetRoomRepository meetRoomRepository;
    @Mock private CheckerUtil checkerUtil;
    @Mock private MeetProperties meetProperties;

    @InjectMocks
    private MeetAccessService service;

    private User user;
    private Project project;
    private MeetRoom room;

    @BeforeEach
    void setUp() {
        user = TestFixtures.ownerUser("user-1");
        project = TestFixtures.project("project-1", user);
        room = new MeetRoom(project, "room-token", "Планёрка", null, null, user);
    }

    @Test
    void invalidJwt_isRejected() {
        when(jwtUtils.validateJwtToken("bad")).thenReturn(false);

        assertThatThrownBy(() -> service.authorize("bad", "room-token"))
                .isInstanceOf(NotFoundException.class)
                .hasMessageContaining("токен");
    }

    @Test
    void unknownRoom_isRejected() {
        when(jwtUtils.validateJwtToken("jwt")).thenReturn(true);
        when(jwtUtils.getUserGuidFromJwtToken("jwt")).thenReturn("user-1");
        when(meetRoomRepository.findByToken("nope")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.authorize("jwt", "nope"))
                .isInstanceOf(NotFoundException.class)
                .hasMessageContaining("не найдена");
    }

    @Test
    void nonMember_isRejected() throws Exception {
        when(jwtUtils.validateJwtToken("jwt")).thenReturn(true);
        when(jwtUtils.getUserGuidFromJwtToken("jwt")).thenReturn("stranger");
        when(meetRoomRepository.findByToken("room-token")).thenReturn(Optional.of(room));
        when(checkerUtil.findAndCheckActiveUser("stranger", project))
                .thenThrow(new NotFoundException("Вам не доступен проект"));

        assertThatThrownBy(() -> service.authorize("jwt", "room-token"))
                .isInstanceOf(NotFoundException.class)
                .hasMessageContaining("не доступен");
    }

    @Test
    void member_getsFullSessionContext() throws Exception {
        when(jwtUtils.validateJwtToken("jwt")).thenReturn(true);
        when(jwtUtils.getUserGuidFromJwtToken("jwt")).thenReturn("user-1");
        when(meetRoomRepository.findByToken("room-token")).thenReturn(Optional.of(room));
        when(checkerUtil.findAndCheckActiveUser("user-1", project)).thenReturn(user);
        when(meetProperties.getMaxParticipants()).thenReturn(8);

        MeetSessionAuth auth = service.authorize("jwt", "room-token");

        assertThat(auth.userId()).isEqualTo("user-1");
        assertThat(auth.roomToken()).isEqualTo("room-token");
        assertThat(auth.roomTitle()).isEqualTo("Планёрка");
        assertThat(auth.projectId()).isEqualTo("project-1");
        assertThat(auth.creatorUserId()).isEqualTo("user-1");
        assertThat(auth.maxParticipants()).isEqualTo(8);
    }

    @Test
    void endedRoom_isRejected() {
        when(jwtUtils.validateJwtToken("jwt")).thenReturn(true);
        when(jwtUtils.getUserGuidFromJwtToken("jwt")).thenReturn("user-1");
        room.end();
        when(meetRoomRepository.findByToken("room-token")).thenReturn(Optional.of(room));

        assertThatThrownBy(() -> service.authorize("jwt", "room-token"))
                .isInstanceOf(NotFoundException.class)
                .hasMessageContaining("завершена");
    }
}
