package ru.worktechlab.work_task.services;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import ru.worktechlab.work_task.TestFixtures;
import ru.worktechlab.work_task.dto.UserAndProjectData;
import ru.worktechlab.work_task.exceptions.NotFoundException;
import ru.worktechlab.work_task.mappers.ProjectMapper;
import ru.worktechlab.work_task.mappers.TaskMapper;
import ru.worktechlab.work_task.models.tables.Project;
import ru.worktechlab.work_task.models.tables.User;
import ru.worktechlab.work_task.repositories.ProjectRepository;
import ru.worktechlab.work_task.repositories.SprintsRepository;
import ru.worktechlab.work_task.repositories.TaskRepository;
import ru.worktechlab.work_task.repositories.TaskStatusRepository;
import ru.worktechlab.work_task.repositories.UserRepository;
import ru.worktechlab.work_task.repositories.UsersProjectsRepository;
import ru.worktechlab.work_task.utils.CheckerUtil;
import ru.worktechlab.work_task.utils.UserContext;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * T-518: «текущий проект» перестал быть побочным эффектом чтения.
 *
 * <p>До этого {@code GET /projects/{id}} писал {@code last_project_id}, то
 * есть просмотр данных проекта молча переключал рабочий контекст глобально:
 * доска в соседней вкладке уезжала на чужой проект, а ссылку на доску нельзя
 * было передать (G-1…G-3 аудита T-500).
 */
@ExtendWith(MockitoExtension.class)
class ProjectsServiceCurrentProjectTest {

    @Mock private UsersProjectsRepository usersProjectsRepository;
    @Mock private ProjectRepository projectRepository;
    @Mock private UserService userService;
    @Mock private UserContext userContext;
    @Mock private TaskStatusRepository taskStatusRepository;
    @Mock private ProjectMapper projectMapper;
    @Mock private SprintsRepository sprintsRepository;
    @Mock private CheckerUtil checkerUtil;
    @Mock private UserRepository userRepository;
    @Mock private TaskRepository taskRepository;
    @Mock private TaskMapper taskMapper;
    @Mock private RoleService roleService;
    // T-512: зависимость появилась у ProjectsService; здесь она не используется,
    // но без объявления @InjectMocks подставил бы null.
    @Mock private RuleTransferService ruleTransferService;
    @Mock private ProcessStepService processStepService;

    @InjectMocks
    private ProjectsService projectsService;

    private User user;
    private Project project;

    @BeforeEach
    void setUp() {
        user = TestFixtures.ownerUser("user-1");
        project = TestFixtures.project("project-1", user);
    }

    @Test
    void getProjectData_doesNotChangeCurrentProject() throws NotFoundException {
        ReflectionTestUtils.setField(user, "lastProjectId", "project-other");
        when(checkerUtil.findAndCheckProjectUserData("project-1", false, false))
                .thenReturn(new UserAndProjectData(project, user));

        projectsService.getProjectData("project-1");

        assertThat(user.getLastProjectId())
                .as("чтение данных проекта не имеет права переключать рабочий контекст пользователя")
                .isEqualTo("project-other");
    }

    @Test
    void rememberLastProject_storesExplicitChoice() throws NotFoundException {
        when(checkerUtil.findAndCheckProjectUserData("project-1", false, true))
                .thenReturn(new UserAndProjectData(project, user));

        projectsService.rememberLastProject("project-1");

        assertThat(user.getLastProjectId()).isEqualTo("project-1");
        verify(userRepository).flush();
    }

    @Test
    void rememberLastProject_rejectsForeignProject() throws NotFoundException {
        when(checkerUtil.findAndCheckProjectUserData("foreign", false, true))
                .thenThrow(new NotFoundException("Вам не доступен проект"));

        org.assertj.core.api.Assertions
                .assertThatThrownBy(() -> projectsService.rememberLastProject("foreign"))
                .isInstanceOf(NotFoundException.class);
        assertThat(user.getLastProjectId()).isNull();
    }

    /** G-8: удалённый проект больше не «залипает» в точке входа. */
    @Test
    void getLastProjectId_fallsBackWhenStoredProjectIsGone() {
        Project available = TestFixtures.project("project-2", user);
        user.getProjects().add(available);
        ReflectionTestUtils.setField(user, "lastProjectId", "project-deleted");
        stubCurrentUser();

        assertThat(projectsService.getLastProjectId()).isEqualTo("project-2");
    }

    @Test
    void getLastProjectId_keepsStoredProjectWhenStillAvailable() {
        user.getProjects().add(project);
        ReflectionTestUtils.setField(user, "lastProjectId", "project-1");
        stubCurrentUser();

        assertThat(projectsService.getLastProjectId()).isEqualTo("project-1");
    }

    @Test
    void getLastProjectId_returnsNullWithoutProjects() {
        ReflectionTestUtils.setField(user, "lastProjectId", "project-deleted");
        stubCurrentUser();

        assertThat(projectsService.getLastProjectId()).isNull();
    }

    private void stubCurrentUser() {
        UserContext realCtx = new UserContext();
        when(userContext.getUserData())
                .thenReturn(TestFixtures.contextData(realCtx, "user-1", "owner@test.com"));
        when(userService.findActiveUserById("user-1")).thenReturn(user);
    }
}
