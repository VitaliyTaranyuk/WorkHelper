package ru.worktechlab.work_task.utils;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import ru.worktechlab.work_task.TestFixtures;
import ru.worktechlab.work_task.exceptions.BadRequestException;
import ru.worktechlab.work_task.exceptions.NotFoundException;
import ru.worktechlab.work_task.exceptions.PermissionDeniedException;
import ru.worktechlab.work_task.models.tables.Project;
import ru.worktechlab.work_task.models.tables.User;
import ru.worktechlab.work_task.repositories.ProjectRepository;
import ru.worktechlab.work_task.repositories.UserRepository;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CheckerUtilTest {

    @Mock private UserContext userContext;
    @Mock private ProjectRepository projectRepository;
    @Mock private UserRepository userRepository;

    @InjectMocks
    private CheckerUtil checkerUtil;

    private User owner;
    private User member;
    private Project project;

    @BeforeEach
    void setUp() {
        owner = TestFixtures.ownerUser("owner-1");
        member = TestFixtures.user("member-1", "member@test.com");
        project = TestFixtures.project("project-1", owner);

        owner.getProjects().add(project);
        member.getProjects().add(project);
    }

    @Test
    void checkProjectOwner_shouldNotThrow_whenUserIsOwner() throws Exception {
        assertThatCode(() -> checkerUtil.checkProjectOwner(project, owner))
                .doesNotThrowAnyException();
    }

    @Test
    void checkProjectOwner_shouldThrowBadRequestException_whenUserIsNotOwner() throws Exception {
        assertThatThrownBy(() -> checkerUtil.checkProjectOwner(project, member))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining(project.getName());
    }

    @Test
    void checkExtendedPermission_shouldNotThrow_whenUserIsProjectOwner() throws Exception {
        assertThatCode(() -> checkerUtil.checkExtendedPermission(owner, project))
                .doesNotThrowAnyException();
    }

    @Test
    void checkExtendedPermission_shouldThrowPermissionDeniedException_whenUserHasNoPermission() throws Exception {
        assertThatThrownBy(() -> checkerUtil.checkExtendedPermission(member, project))
                .isInstanceOf(PermissionDeniedException.class);
    }

    @Test
    void findProject_shouldThrowNotFoundException_whenProjectDoesNotExist() throws Exception {
        when(projectRepository.findById("missing")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> checkerUtil.findProject("missing", false))
                .isInstanceOf(NotFoundException.class)
                .hasMessageContaining("missing");
    }

    @Test
    void findAndCheckProjectUserData_shouldThrowNotFoundException_whenUserNotMemberOfProject() throws Exception {
        User stranger = TestFixtures.user("stranger-1", "stranger@test.com");
        UserContext realCtx = new UserContext();
        UserContext.UserContextData strangerCtx = TestFixtures.contextData(realCtx, "stranger-1", "stranger@test.com");

        when(userContext.getUserData()).thenReturn(strangerCtx);
        when(projectRepository.findById("project-1")).thenReturn(Optional.of(project));
        when(userRepository.findActiveUserById("stranger-1")).thenReturn(Optional.of(stranger));

        assertThatThrownBy(() -> checkerUtil.findAndCheckProjectUserData("project-1", false, false))
                .isInstanceOf(NotFoundException.class)
                .hasMessageContaining(project.getName());
    }
}
