package ru.worktechlab.work_task.services;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import ru.worktechlab.work_task.TestFixtures;
import ru.worktechlab.work_task.dto.UserAndProjectData;
import ru.worktechlab.work_task.dto.invites.InviteAcceptResponseDto;
import ru.worktechlab.work_task.dto.invites.InviteCreateResponseDto;
import ru.worktechlab.work_task.exceptions.BadRequestException;
import ru.worktechlab.work_task.exceptions.NotFoundException;
import ru.worktechlab.work_task.models.tables.Project;
import ru.worktechlab.work_task.models.tables.ProjectInvite;
import ru.worktechlab.work_task.models.tables.User;
import ru.worktechlab.work_task.models.tables.UsersProject;
import ru.worktechlab.work_task.repositories.ProjectInviteRepository;
import ru.worktechlab.work_task.repositories.UsersProjectsRepository;
import ru.worktechlab.work_task.utils.CheckerUtil;
import ru.worktechlab.work_task.utils.UserContext;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * ТП-35: одноразовые ссылки-приглашения — владелец создаёт, получатель
 * присоединяется; использованная ссылка отклоняется, участник проходит
 * без расходования ссылки.
 */
@ExtendWith(MockitoExtension.class)
class ProjectInviteServiceTest {

    @Mock private ProjectInviteRepository inviteRepository;
    @Mock private UsersProjectsRepository usersProjectsRepository;
    @Mock private CheckerUtil checkerUtil;
    @Mock private UserContext userContext;
    @Mock private UserService userService;

    @InjectMocks
    private ProjectInviteService service;

    private User owner;
    private Project project;

    @BeforeEach
    void setUp() {
        owner = TestFixtures.ownerUser("owner-1");
        project = TestFixtures.project("project-1", owner);
    }

    @Test
    void createInvite_shouldPersistAndReturnToken() throws Exception {
        when(checkerUtil.findAndCheckProjectUserData("project-1", false, false))
                .thenReturn(new UserAndProjectData(project, owner));
        when(inviteRepository.saveAndFlush(any(ProjectInvite.class)))
                .thenAnswer(inv -> {
                    ProjectInvite invite = inv.getArgument(0);
                    org.springframework.test.util.ReflectionTestUtils.setField(invite, "id", "token-1");
                    return invite;
                });

        InviteCreateResponseDto result = service.createInvite("project-1");

        assertThat(result.getToken()).isEqualTo("token-1");
        verify(checkerUtil).checkProjectOwner(project, owner);
    }

    @Test
    void acceptInvite_shouldJoinProjectAndConsumeInvite() throws Exception {
        User newcomer = TestFixtures.user("user-2", "new@test.com");
        UserContext realCtx = new UserContext();
        when(userContext.getUserData())
                .thenReturn(TestFixtures.contextData(realCtx, "user-2", "new@test.com"));
        when(userService.findActiveUserById("user-2")).thenReturn(newcomer);
        ProjectInvite invite = new ProjectInvite(project, owner);
        when(inviteRepository.findById("token-1")).thenReturn(Optional.of(invite));

        InviteAcceptResponseDto result = service.acceptInvite("token-1");

        assertThat(result.getProjectId()).isEqualTo("project-1");
        assertThat(result.isAlreadyMember()).isFalse();
        assertThat(invite.isUsed()).isTrue();
        assertThat(invite.getUsedBy()).isEqualTo(newcomer);
        verify(usersProjectsRepository).saveAndFlush(any(UsersProject.class));
    }

    @Test
    void acceptInvite_shouldRejectUsedInvite() throws Exception {
        User newcomer = TestFixtures.user("user-3", "third@test.com");
        UserContext realCtx = new UserContext();
        when(userContext.getUserData())
                .thenReturn(TestFixtures.contextData(realCtx, "user-3", "third@test.com"));
        when(userService.findActiveUserById("user-3")).thenReturn(newcomer);
        ProjectInvite invite = new ProjectInvite(project, owner);
        invite.markUsed(TestFixtures.user("user-2", "new@test.com"));
        when(inviteRepository.findById("token-1")).thenReturn(Optional.of(invite));

        assertThatThrownBy(() -> service.acceptInvite("token-1"))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("уже использована");
        verify(usersProjectsRepository, never()).saveAndFlush(any(UsersProject.class));
    }

    @Test
    void acceptInvite_shouldPassExistingMemberWithoutConsuming() throws Exception {
        owner.getProjects().add(project);
        UserContext realCtx = new UserContext();
        when(userContext.getUserData())
                .thenReturn(TestFixtures.contextData(realCtx, "owner-1", "owner@test.com"));
        when(userService.findActiveUserById("owner-1")).thenReturn(owner);
        ProjectInvite invite = new ProjectInvite(project, owner);
        when(inviteRepository.findById("token-1")).thenReturn(Optional.of(invite));

        InviteAcceptResponseDto result = service.acceptInvite("token-1");

        assertThat(result.isAlreadyMember()).isTrue();
        assertThat(invite.isUsed()).isFalse();
        verify(usersProjectsRepository, never()).saveAndFlush(any(UsersProject.class));
    }

    @Test
    void acceptInvite_shouldThrowNotFound_forUnknownToken() throws Exception {
        User newcomer = TestFixtures.user("user-2", "new@test.com");
        UserContext realCtx = new UserContext();
        when(userContext.getUserData())
                .thenReturn(TestFixtures.contextData(realCtx, "user-2", "new@test.com"));
        when(userService.findActiveUserById("user-2")).thenReturn(newcomer);
        when(inviteRepository.findById("missing")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.acceptInvite("missing"))
                .isInstanceOf(NotFoundException.class);
    }
}
