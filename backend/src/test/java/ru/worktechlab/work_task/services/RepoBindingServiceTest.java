package ru.worktechlab.work_task.services;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import ru.worktechlab.work_task.TestFixtures;
import ru.worktechlab.work_task.dto.UserAndProjectData;
import ru.worktechlab.work_task.dto.repobinding.RepoBindingDto;
import ru.worktechlab.work_task.dto.repobinding.RepoBindingRequestDto;
import ru.worktechlab.work_task.exceptions.BadRequestException;
import ru.worktechlab.work_task.exceptions.NotFoundException;
import ru.worktechlab.work_task.models.tables.Project;
import ru.worktechlab.work_task.models.tables.RepoBinding;
import ru.worktechlab.work_task.models.tables.User;
import ru.worktechlab.work_task.repositories.RepoBindingRepository;
import ru.worktechlab.work_task.utils.CheckerUtil;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * T-510: привязка проекта к репозиторию.
 *
 * <p>Проверяется не «CRUD работает», а три свойства, без которых привязка стала
 * бы дырой: изменение доступно только владельцу, чужой id не редактируется через
 * свой проект, и повторная привязка того же адреса отвергается понятным
 * сообщением, а не нарушением ограничения БД (K-34).
 */
@ExtendWith(MockitoExtension.class)
class RepoBindingServiceTest {

    @Mock private RepoBindingRepository repoBindingRepository;
    @Mock private CheckerUtil checkerUtil;

    @InjectMocks private RepoBindingService service;

    private static final String PROJECT_ID = "project-1";

    private User owner;
    private Project project;

    @BeforeEach
    void setUp() {
        owner = TestFixtures.ownerUser("user-owner");
        project = TestFixtures.project(PROJECT_ID, owner);
    }

    private UserAndProjectData ctx() {
        return new UserAndProjectData(project, owner);
    }

    private static RepoBindingRequestDto request(String url) {
        RepoBindingRequestDto dto = new RepoBindingRequestDto();
        dto.setProvider("github");
        dto.setUrl(url);
        dto.setDefaultBranch("main");
        return dto;
    }

    @Test
    void createSavesBindingForOwner() throws Exception {
        when(checkerUtil.findAndCheckProjectUserData(PROJECT_ID, false, false)).thenReturn(ctx());
        when(repoBindingRepository.existsByProjectIdAndUrl(PROJECT_ID, "https://github.com/x/y"))
                .thenReturn(false);

        RepoBindingDto created = service.create(PROJECT_ID, request("https://github.com/x/y"));

        assertThat(created.url()).isEqualTo("https://github.com/x/y");
        assertThat(created.defaultBranch()).isEqualTo("main");
        verify(checkerUtil).checkProjectOwner(project, owner);
        verify(repoBindingRepository).saveAndFlush(any(RepoBinding.class));
    }

    @Test
    void createRejectsDuplicateUrlWithReadableMessage() throws Exception {
        when(checkerUtil.findAndCheckProjectUserData(PROJECT_ID, false, false)).thenReturn(ctx());
        when(repoBindingRepository.existsByProjectIdAndUrl(PROJECT_ID, "https://github.com/x/y"))
                .thenReturn(true);

        assertThatThrownBy(() -> service.create(PROJECT_ID, request("https://github.com/x/y")))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("уже привязан");

        verify(repoBindingRepository, never()).saveAndFlush(any());
    }

    /**
     * Членство проверяет CheckerUtil тем же механизмом, что и все остальные
     * запросы: если он отказал — сервис не должен ничего писать.
     */
    @Test
    void createOnForeignProjectIsRejectedBeforeAnyWrite() throws Exception {
        when(checkerUtil.findAndCheckProjectUserData("foreign", false, false))
                .thenThrow(new NotFoundException("Не найден проект"));

        assertThatThrownBy(() -> service.create("foreign", request("https://github.com/x/y")))
                .isInstanceOf(NotFoundException.class);

        verify(repoBindingRepository, never()).saveAndFlush(any());
    }

    /**
     * Ключевое: привязка ищется В ПРЕДЕЛАХ проекта. Иначе владелец одного
     * проекта правил бы записи другого, зная только их id.
     */
    @Test
    void updateDoesNotTouchBindingFromAnotherProject() throws Exception {
        when(checkerUtil.findAndCheckProjectUserData(PROJECT_ID, false, false)).thenReturn(ctx());
        when(repoBindingRepository.findByIdAndProjectId("binding-of-other-project", PROJECT_ID))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() ->
                service.update(PROJECT_ID, "binding-of-other-project", request("https://github.com/x/y")))
                .isInstanceOf(NotFoundException.class);

        verify(repoBindingRepository, never()).saveAndFlush(any());
    }

    /**
     * Смена ветки не должна спотыкаться о собственный адрес привязки — иначе
     * поменять `main` на `develop` было бы невозможно.
     */
    @Test
    void updateAllowsKeepingOwnUrl() throws Exception {
        RepoBinding existing = new RepoBinding(project, "github", "https://github.com/x/y", "main");
        when(checkerUtil.findAndCheckProjectUserData(PROJECT_ID, false, false)).thenReturn(ctx());
        when(repoBindingRepository.findByIdAndProjectId("b1", PROJECT_ID)).thenReturn(Optional.of(existing));

        RepoBindingRequestDto data = request("https://github.com/x/y");
        data.setDefaultBranch("develop");
        RepoBindingDto updated = service.update(PROJECT_ID, "b1", data);

        assertThat(updated.defaultBranch()).isEqualTo("develop");
        verify(repoBindingRepository, never()).existsByProjectIdAndUrl(any(), any());
    }

    @Test
    void listIsAvailableToAnyProjectMember() throws Exception {
        User member = TestFixtures.user("user-member", "member@test.com");
        when(checkerUtil.findAndCheckProjectUserData(PROJECT_ID, false, false))
                .thenReturn(new UserAndProjectData(project, member));
        when(repoBindingRepository.findByProjectIdOrderByCreatedAtAsc(PROJECT_ID))
                .thenReturn(List.of(new RepoBinding(project, "github", "https://github.com/x/y", "main")));

        assertThat(service.list(PROJECT_ID)).hasSize(1);
        // Чтение владельцем быть не обязано — иначе участник не увидел бы,
        // с каким репозиторием работает его же проект.
        verify(checkerUtil, never()).checkProjectOwner(any(), any());
    }

    /**
     * I-03 (ADR-027): проект без единой привязки — нормальное состояние, а не
     * ошибка. Именно это делает откат фазы «перестать пользоваться».
     */
    @Test
    void projectWithoutBindingsReturnsEmptyList() throws Exception {
        when(checkerUtil.findAndCheckProjectUserData(PROJECT_ID, false, false)).thenReturn(ctx());
        when(repoBindingRepository.findByProjectIdOrderByCreatedAtAsc(PROJECT_ID)).thenReturn(List.of());

        assertThat(service.list(PROJECT_ID)).isEmpty();
    }
}
