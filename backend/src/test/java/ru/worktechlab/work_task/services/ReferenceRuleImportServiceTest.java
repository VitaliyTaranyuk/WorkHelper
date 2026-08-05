package ru.worktechlab.work_task.services;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import ru.worktechlab.work_task.TestFixtures;
import ru.worktechlab.work_task.dto.UserAndProjectData;
import ru.worktechlab.work_task.dto.rules.RuleSetDto;
import ru.worktechlab.work_task.exceptions.BadRequestException;
import ru.worktechlab.work_task.exceptions.NotFoundException;
import ru.worktechlab.work_task.models.tables.Project;
import ru.worktechlab.work_task.models.tables.Rule;
import ru.worktechlab.work_task.models.tables.RuleSet;
import ru.worktechlab.work_task.models.tables.User;
import ru.worktechlab.work_task.repositories.RuleRepository;
import ru.worktechlab.work_task.repositories.RuleSetRepository;
import ru.worktechlab.work_task.utils.CheckerUtil;
import ru.worktechlab.work_task.utils.UserContext;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * T-513: импорт эталонного набора WorkHelper.
 *
 * <p>Каталог здесь **настоящий**, а не подменённый моком: подмена проверяла бы только
 * проводку, тогда как половина ценности задачи — в том, что реальный ресурс читается,
 * разбирается и даёт непустой набор. Совпадение каталога с реестром стережёт отдельный
 * {@link ReferenceCatalogSyncTest}.
 */
@ExtendWith(MockitoExtension.class)
class ReferenceRuleImportServiceTest {

    @Mock private RuleSetRepository ruleSetRepository;
    @Mock private RuleRepository ruleRepository;
    @Mock private CheckerUtil checkerUtil;
    @Mock private UserContext userContext;

    private ReferenceRuleCatalog catalog;
    private ReferenceRuleImportService service;

    private User owner;
    private User member;
    private Project project;

    @BeforeEach
    void setUp() {
        catalog = new ReferenceRuleCatalog(new ObjectMapper());
        service = new ReferenceRuleImportService(
                catalog, ruleSetRepository, ruleRepository, checkerUtil, userContext);
        owner = TestFixtures.ownerUser("user-owner");
        member = TestFixtures.user("user-member", "member@test.com");
        project = TestFixtures.project("project-1", owner);
    }

    private void stubCurrentUser() {
        UserContext realCtx = new UserContext();
        when(userContext.getUserData())
                .thenReturn(TestFixtures.contextData(realCtx, "user-owner", "owner@test.com"));
        when(checkerUtil.findActiveUser("user-owner")).thenReturn(owner);
    }

    /** Каталог перечисляет наборы с непустым составом — иначе импортировать нечего. */
    @Test
    void availableSetsAreListedWithCounts() {
        assertThat(service.available()).isNotEmpty();
        assertThat(service.available()).allSatisfy(set ->
                assertThat(set.rulesCount()).isPositive());
        assertThat(service.available()).extracting(s -> s.id()).contains("core");
    }

    @Test
    void unknownReferenceIsRejected() {
        assertThatThrownBy(() -> service.importIntoMy("no-such-set"))
                .isInstanceOf(NotFoundException.class)
                .hasMessageContaining("не найден");
    }

    @Test
    void importIntoMyCreatesUserLevelSetWithSystemRules() throws Exception {
        stubCurrentUser();
        when(ruleSetRepository.existsByOwnerIdAndProjectIsNullAndName(eq("user-owner"), any()))
                .thenReturn(false);

        RuleSetDto created = service.importIntoMy("core");

        assertThat(created.projectId()).as("набор уровня пользователя — без проекта").isNull();
        assertThat(created.rulesCount()).isGreaterThanOrEqualTo(46);

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<Rule>> saved = ArgumentCaptor.forClass(List.class);
        verify(ruleRepository).saveAllAndFlush(saved.capture());
        assertThat(saved.getValue()).extracting(Rule::getCode).contains("K-01", "K-46");
        // Импортированное — корень канона: закреплено и без ссылки на источник.
        assertThat(saved.getValue()).allMatch(Rule::isSystemRule);
        assertThat(saved.getValue()).allMatch(r -> r.getSourceRuleId() == null);
    }

    @Test
    void repeatedImportIsRejectedWithReadableMessage() throws Exception {
        stubCurrentUser();
        when(ruleSetRepository.existsByOwnerIdAndProjectIsNullAndName(eq("user-owner"), any()))
                .thenReturn(true);

        assertThatThrownBy(() -> service.importIntoMy("core"))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("уже импортирован");

        verify(ruleSetRepository, never()).saveAndFlush(any());
        verifyNoInteractions(ruleRepository);
    }

    /** Наполнение проекта правилами — изменение проекта, значит владелец (T-511). */
    @Test
    void importIntoProjectRequiresProjectOwner() throws Exception {
        when(checkerUtil.findAndCheckProjectUserData("project-1", false, false))
                .thenReturn(new UserAndProjectData(project, member));
        doThrow(new BadRequestException("Вы не являетесь руководителем проекта"))
                .when(checkerUtil).checkProjectOwner(project, member);

        assertThatThrownBy(() -> service.importIntoProject("project-1", "core"))
                .isInstanceOf(BadRequestException.class);

        verify(ruleSetRepository, never()).saveAndFlush(any());
    }

    @Test
    void importIntoProjectCreatesProjectScopedSet() throws Exception {
        when(checkerUtil.findAndCheckProjectUserData("project-1", false, false))
                .thenReturn(new UserAndProjectData(project, owner));
        when(ruleSetRepository.existsByProjectIdAndName(eq("project-1"), any())).thenReturn(false);

        RuleSetDto created = service.importIntoProject("project-1", "pack-react");

        assertThat(created.projectId()).isEqualTo("project-1");
        assertThat(created.rulesCount()).isEqualTo(2);

        ArgumentCaptor<RuleSet> saved = ArgumentCaptor.forClass(RuleSet.class);
        verify(ruleSetRepository).saveAndFlush(saved.capture());
        assertThat(saved.getValue().getProject()).isSameAs(project);
        assertThat(saved.getValue().getName()).contains("React");
    }
}
