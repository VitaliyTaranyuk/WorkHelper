package ru.worktechlab.work_task.services;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import ru.worktechlab.work_task.TestFixtures;
import ru.worktechlab.work_task.exceptions.NotFoundException;
import ru.worktechlab.work_task.models.enums.RuleKind;
import ru.worktechlab.work_task.models.enums.RuleLevel;
import ru.worktechlab.work_task.models.enums.RuleStrength;
import ru.worktechlab.work_task.models.enums.RuleVerification;
import ru.worktechlab.work_task.models.tables.Project;
import ru.worktechlab.work_task.models.tables.Rule;
import ru.worktechlab.work_task.models.tables.RuleSet;
import ru.worktechlab.work_task.models.tables.User;
import ru.worktechlab.work_task.repositories.RuleRepository;
import ru.worktechlab.work_task.repositories.RuleSetRepository;
import ru.worktechlab.work_task.utils.CheckerUtil;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

/**
 * T-512: перенос правил в создаваемый проект.
 *
 * <p>Главное свойство проверяется первым: **пользователь без правил создаёт
 * проект без единой новой записи**. Создание проекта — критичный путь
 * (`PHASE5_INVARIANTS §2`), и шаг, добавленный в него, обязан быть незаметным
 * для тех, кто фазой не пользуется (I-03).
 *
 * <p>Остальное — про честность копии: она независима от источника, хранит
 * происхождение и не пускает копировать из чужого проекта.
 */
@ExtendWith(MockitoExtension.class)
class RuleTransferServiceTest {

    @Mock private RuleSetRepository ruleSetRepository;
    @Mock private RuleRepository ruleRepository;
    @Mock private CheckerUtil checkerUtil;

    @InjectMocks private RuleTransferService service;

    private User creator;
    private Project target;

    @BeforeEach
    void setUp() {
        creator = TestFixtures.ownerUser("user-owner");
        target = TestFixtures.project("project-new", creator);
    }

    private static RuleSet set(String id, User owner, Project project, String name) {
        RuleSet set = new RuleSet(owner, project, name, "описание");
        ReflectionTestUtils.setField(set, "id", id);
        return set;
    }

    private static Rule rule(RuleSet set, String id, String code, boolean systemRule) {
        Rule rule = new Rule(set, code, RuleLevel.CORE, RuleKind.PROCEDURE, RuleStrength.MUST,
                "всегда", RuleVerification.MANUAL, "тело правила", null, systemRule);
        ReflectionTestUtils.setField(rule, "id", id);
        return rule;
    }

    /**
     * I-03: у пользователя без общих наборов и без донора шаг не создаёт ничего.
     * Без этого свойства фаза перестала бы откатываться «переставанием
     * пользоваться» (ADR-027).
     */
    @Test
    void userWithoutRulesGetsProjectWithoutAnyRecord() throws Exception {
        when(ruleSetRepository.findByOwnerIdAndProjectIsNullOrderByCreatedAtAsc("user-owner"))
                .thenReturn(List.of());

        assertThat(service.copyIntoNewProject(target, creator, null)).isZero();

        verify(ruleSetRepository, never()).saveAndFlush(any());
        verifyNoInteractions(ruleRepository);
        // Донора нет — проверять доступ не к чему.
        verify(checkerUtil, never()).findAndCheckProjectUserData(anyString(), anyBoolean(), anyBoolean());
    }

    /** Пустая строка донора — то же самое, что его отсутствие. */
    @Test
    void blankDonorIsTreatedAsNoDonor() throws Exception {
        when(ruleSetRepository.findByOwnerIdAndProjectIsNullOrderByCreatedAtAsc("user-owner"))
                .thenReturn(List.of());

        assertThat(service.copyIntoNewProject(target, creator, "   ")).isZero();

        verify(checkerUtil, never()).findAndCheckProjectUserData(anyString(), anyBoolean(), anyBoolean());
    }

    @Test
    void generalUserSetsAreCopiedIntoNewProject() throws Exception {
        RuleSet general = set("set-general", creator, null, "Ядро");
        when(ruleSetRepository.findByOwnerIdAndProjectIsNullOrderByCreatedAtAsc("user-owner"))
                .thenReturn(List.of(general));
        when(ruleRepository.findByRuleSetId("set-general")).thenReturn(List.of());

        assertThat(service.copyIntoNewProject(target, creator, null)).isEqualTo(1);

        ArgumentCaptor<RuleSet> saved = ArgumentCaptor.forClass(RuleSet.class);
        verify(ruleSetRepository).saveAndFlush(saved.capture());
        RuleSet copy = saved.getValue();
        assertThat(copy.getProject()).isSameAs(target);
        assertThat(copy.getName()).isEqualTo("Ядро");
        // Копия начинает собственную историю версий: она не «версия 2» донора.
        assertThat(copy.getVersion()).isEqualTo(1);
        assertThat(copy).isNotSameAs(general);
    }

    /**
     * Копия независима от источника: создаются новые записи, донорские не
     * трогаются, а происхождение остаётся в {@code sourceRuleId}.
     */
    @Test
    void copiedRulesAreNewRecordsWithProvenance() throws Exception {
        RuleSet general = set("set-general", creator, null, "Ядро");
        Rule source = rule(general, "rule-source", "K-01", false);
        when(ruleSetRepository.findByOwnerIdAndProjectIsNullOrderByCreatedAtAsc("user-owner"))
                .thenReturn(List.of(general));
        when(ruleRepository.findByRuleSetId("set-general")).thenReturn(List.of(source));

        service.copyIntoNewProject(target, creator, null);

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<Rule>> saved = ArgumentCaptor.forClass(List.class);
        verify(ruleRepository).saveAllAndFlush(saved.capture());
        Rule copy = saved.getValue().get(0);

        assertThat(copy).isNotSameAs(source);
        assertThat(copy.getCode()).isEqualTo("K-01");
        assertThat(copy.getSourceRuleId()).isEqualTo("rule-source");
        // Донорское правило осталось нетронутым — иначе «копия» была бы переносом.
        assertThat(source.getSourceRuleId()).isNull();
        assertThat(source.getRuleSet()).isSameAs(general);
    }

    /** Закреплённость переносится как есть: иначе копия меняла бы смысл. */
    @Test
    void systemFlagSurvivesCopy() throws Exception {
        RuleSet general = set("set-general", creator, null, "Ядро");
        when(ruleSetRepository.findByOwnerIdAndProjectIsNullOrderByCreatedAtAsc("user-owner"))
                .thenReturn(List.of(general));
        when(ruleRepository.findByRuleSetId("set-general")).thenReturn(List.of(
                rule(general, "r1", "K-01", true),
                rule(general, "r2", "K-02", false)));

        service.copyIntoNewProject(target, creator, null);

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<Rule>> saved = ArgumentCaptor.forClass(List.class);
        verify(ruleRepository).saveAllAndFlush(saved.capture());
        assertThat(saved.getValue()).extracting(Rule::isSystemRule).containsExactly(true, false);
    }

    /**
     * Донор проверяется тем же {@code CheckerUtil}, что и любой проектный
     * запрос: скопировать правила из чужого проекта, зная только его id, нельзя.
     */
    @Test
    void inaccessibleDonorIsRejectedBeforeAnyWrite() throws Exception {
        when(ruleSetRepository.findByOwnerIdAndProjectIsNullOrderByCreatedAtAsc("user-owner"))
                .thenReturn(List.of());
        when(checkerUtil.findAndCheckProjectUserData("foreign-project", false, false))
                .thenThrow(new NotFoundException("Вам не доступен проект"));

        assertThatThrownBy(() -> service.copyIntoNewProject(target, creator, "foreign-project"))
                .isInstanceOf(NotFoundException.class);

        verify(ruleSetRepository, never()).saveAndFlush(any());
        verify(ruleSetRepository, never()).findByProjectIdOrderByCreatedAtAsc(anyString());
    }

    @Test
    void donorSetsAreCopiedAlongWithGeneralOnes() throws Exception {
        RuleSet general = set("set-general", creator, null, "Ядро");
        Project donor = TestFixtures.project("project-donor", creator);
        RuleSet donorSet = set("set-donor", creator, donor, "Правила донора");

        when(ruleSetRepository.findByOwnerIdAndProjectIsNullOrderByCreatedAtAsc("user-owner"))
                .thenReturn(List.of(general));
        when(ruleSetRepository.findByProjectIdOrderByCreatedAtAsc("project-donor"))
                .thenReturn(List.of(donorSet));
        when(ruleRepository.findByRuleSetId(anyString())).thenReturn(List.of());

        assertThat(service.copyIntoNewProject(target, creator, "project-donor")).isEqualTo(2);

        ArgumentCaptor<RuleSet> saved = ArgumentCaptor.forClass(RuleSet.class);
        verify(ruleSetRepository, times(2)).saveAndFlush(saved.capture());
        assertThat(saved.getAllValues()).extracting(RuleSet::getName)
                .containsExactly("Ядро", "Правила донора");
        assertThat(saved.getAllValues()).allMatch(s -> s.getProject() == target);
    }
}
