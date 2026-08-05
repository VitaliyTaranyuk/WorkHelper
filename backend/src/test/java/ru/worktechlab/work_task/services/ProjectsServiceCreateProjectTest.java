package ru.worktechlab.work_task.services;

import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import ru.worktechlab.work_task.TestFixtures;
import ru.worktechlab.work_task.dto.projects.ProjectRequestDto;
import ru.worktechlab.work_task.exceptions.NotFoundException;
import ru.worktechlab.work_task.mappers.ProjectMapper;
import ru.worktechlab.work_task.mappers.TaskMapper;
import ru.worktechlab.work_task.models.tables.Project;
import ru.worktechlab.work_task.models.tables.User;
import ru.worktechlab.work_task.repositories.*;
import ru.worktechlab.work_task.utils.CheckerUtil;
import ru.worktechlab.work_task.utils.UserContext;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * T-512: перенос правил встроен в создание проекта.
 *
 * <p>Создание проекта — критичный путь: регрессия здесь ломает вход новых
 * пользователей (`PHASE5_INVARIANTS §2`). Поэтому проверяется не «правила
 * копируются» (это дело {@link RuleTransferServiceTest}), а что шаг стоит
 * внутри создания и что его отказ не оставляет наполовину созданный проект.
 */
@ExtendWith(MockitoExtension.class)
class ProjectsServiceCreateProjectTest {

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
    @Mock private RuleTransferService ruleTransferService;
    @Mock private EntityManager entityManager;

    @InjectMocks private ProjectsService projectsService;

    private User user;

    @BeforeEach
    void setUp() {
        user = TestFixtures.ownerUser("user-1");
        // ProjectsService собирается конструктором (@RequiredArgsConstructor), а
        // entityManager приходит через @PersistenceContext — поле Mockito после
        // конструкторной инъекции уже не заполняет, поэтому ставим руками.
        ReflectionTestUtils.setField(projectsService, "entityManager", entityManager);
    }

    private void stubCurrentUser() {
        UserContext realCtx = new UserContext();
        when(userContext.getUserData())
                .thenReturn(TestFixtures.contextData(realCtx, "user-1", "owner@test.com"));
        when(userService.findActiveUserById("user-1")).thenReturn(user);
    }

    private static ProjectRequestDto request(String donorProjectId) {
        ProjectRequestDto dto = new ProjectRequestDto();
        dto.setName("Новый проект");
        dto.setCode("NP");
        dto.setDonorProjectId(donorProjectId);
        return dto;
    }

    @Test
    void createProjectTransfersRulesWithDonorFromRequest() throws Exception {
        stubCurrentUser();

        projectsService.createProject(request("project-donor"));

        verify(ruleTransferService).copyIntoNewProject(any(Project.class), eq(user), eq("project-donor"));
    }

    /**
     * Запрос без донора — обычное создание проекта: перенос вызывается с
     * {@code null} и (по контракту {@link RuleTransferService}) не создаёт ни
     * одной записи у пользователя без общих наборов (I-03).
     */
    @Test
    void createProjectWithoutDonorStillGoesThroughTransferStep() throws Exception {
        stubCurrentUser();

        projectsService.createProject(request(null));

        verify(ruleTransferService).copyIntoNewProject(any(Project.class), eq(user), isNull());
    }

    /**
     * Недоступный донор обрывает создание. Проект и его колонки живут в той же
     * транзакции (`@TransactionRequired`, `rollbackFor = Exception.class`),
     * поэтому исключение обязано дойти до вызывающего, а не быть проглоченным:
     * иначе пользователь получил бы проект без правил и без объяснения (**W-06**).
     */
    @Test
    void inaccessibleDonorAbortsProjectCreation() throws Exception {
        stubCurrentUser();
        doThrow(new NotFoundException("Вам не доступен проект"))
                .when(ruleTransferService).copyIntoNewProject(any(), any(), eq("foreign"));

        assertThatThrownBy(() -> projectsService.createProject(request("foreign")))
                .isInstanceOf(NotFoundException.class);

        verify(entityManager, never()).refresh(any());
        verify(projectMapper, never()).toProjectDto(any(Project.class));
    }
}
