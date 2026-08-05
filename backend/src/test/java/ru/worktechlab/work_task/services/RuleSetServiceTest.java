package ru.worktechlab.work_task.services;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import ru.worktechlab.work_task.TestFixtures;
import ru.worktechlab.work_task.dto.UserAndProjectData;
import ru.worktechlab.work_task.dto.rules.RuleDto;
import ru.worktechlab.work_task.dto.rules.RuleRequestDto;
import ru.worktechlab.work_task.dto.rules.RuleSetRequestDto;
import ru.worktechlab.work_task.exceptions.BadRequestException;
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
import ru.worktechlab.work_task.utils.UserContext;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

/**
 * T-511: правила как данные.
 *
 * <p>Проверяется не «CRUD работает», а свойства, без которых наборы правил стали
 * бы дырой или ловушкой: чужой пользовательский набор не подтверждает даже
 * собственное существование; проектный набор читает участник, а меняет владелец;
 * правило из чужого набора не редактируется через доступный; дубль кода
 * отвергается понятным сообщением (**K-34**); проект без наборов — норма (I-03).
 */
@ExtendWith(MockitoExtension.class)
class RuleSetServiceTest {

    @Mock private RuleSetRepository ruleSetRepository;
    @Mock private RuleRepository ruleRepository;
    @Mock private CheckerUtil checkerUtil;
    @Mock private UserContext userContext;

    @InjectMocks private RuleSetService service;

    private static final String PROJECT_ID = "project-1";
    private static final String SET_ID = "set-1";

    private User owner;
    private User member;
    private Project project;

    @BeforeEach
    void setUp() {
        owner = TestFixtures.ownerUser("user-owner");
        member = TestFixtures.user("user-member", "member@test.com");
        project = TestFixtures.project(PROJECT_ID, owner);
    }

    private void stubCurrentUser(String userId, String email) {
        UserContext realCtx = new UserContext();
        when(userContext.getUserData()).thenReturn(TestFixtures.contextData(realCtx, userId, email));
    }

    private RuleSet projectSet() {
        RuleSet set = new RuleSet(owner, project, "Правила проекта", null);
        org.springframework.test.util.ReflectionTestUtils.setField(set, "id", SET_ID);
        return set;
    }

    private RuleSet userSet(User setOwner) {
        RuleSet set = new RuleSet(setOwner, null, "Общие правила", null);
        org.springframework.test.util.ReflectionTestUtils.setField(set, "id", SET_ID);
        return set;
    }

    private static RuleRequestDto ruleRequest(String code) {
        RuleRequestDto dto = new RuleRequestDto();
        dto.setCode(code);
        dto.setLevel(RuleLevel.CORE);
        dto.setKind(RuleKind.PROCEDURE);
        dto.setStrength(RuleStrength.MUST);
        dto.setTriggerCondition("всегда");
        dto.setVerification(RuleVerification.MANUAL);
        dto.setBody("Одна задача = одна ветка");
        return dto;
    }

    private static Rule rule(RuleSet set, String code, RuleLevel level, boolean systemRule) {
        return new Rule(set, code, level, RuleKind.PRINCIPLE, RuleStrength.MUST,
                "всегда", RuleVerification.MANUAL, "тело", null, systemRule);
    }

    // --- доступ -------------------------------------------------------------

    /**
     * Ключевое свойство: чужой пользовательский набор обязан выглядеть как
     * несуществующий. Ответ «нет прав» подтвердил бы, что набор с таким id есть.
     */
    @Test
    void foreignUserSetLooksLikeMissing() {
        stubCurrentUser("user-stranger", "stranger@test.com");
        when(ruleSetRepository.findById(SET_ID)).thenReturn(Optional.of(userSet(owner)));

        assertThatThrownBy(() -> service.listRules(SET_ID))
                .isInstanceOf(NotFoundException.class)
                .hasMessageContaining("не найден");

        verifyNoInteractions(ruleRepository);
    }

    /** Свой набор пользователя не должен требовать никакого проекта вообще. */
    @Test
    void ownUserSetIsReadableWithoutAnyProject() throws Exception {
        stubCurrentUser("user-owner", "owner@test.com");
        RuleSet set = userSet(owner);
        when(ruleSetRepository.findById(SET_ID)).thenReturn(Optional.of(set));
        when(ruleRepository.findByRuleSetId(SET_ID)).thenReturn(List.of(rule(set, "K-01", RuleLevel.CORE, false)));

        assertThat(service.listRules(SET_ID)).hasSize(1);
        verify(checkerUtil, never()).findAndCheckProjectUserData(anyString(), anyBoolean(), anyBoolean());
    }

    /**
     * Правила проекта читает любой участник: иначе он не увидел бы, по каким
     * правилам работает его же проект.
     */
    @Test
    void projectSetIsReadableByAnyMember() throws Exception {
        when(ruleSetRepository.findById(SET_ID)).thenReturn(Optional.of(projectSet()));
        when(checkerUtil.findAndCheckProjectUserData(PROJECT_ID, false, false))
                .thenReturn(new UserAndProjectData(project, member));
        when(ruleRepository.findByRuleSetId(SET_ID)).thenReturn(List.of());

        assertThat(service.listRules(SET_ID)).isEmpty();
        verify(checkerUtil, never()).checkProjectOwner(any(), any());
    }

    /** А меняет — только владелец проекта, как у колонок доски. */
    @Test
    void projectSetIsWritableOnlyByProjectOwner() throws Exception {
        when(ruleSetRepository.findById(SET_ID)).thenReturn(Optional.of(projectSet()));
        when(checkerUtil.findAndCheckProjectUserData(PROJECT_ID, false, false))
                .thenReturn(new UserAndProjectData(project, member));
        doThrow(new BadRequestException("Вы не являетесь руководителем проекта"))
                .when(checkerUtil).checkProjectOwner(project, member);

        assertThatThrownBy(() -> service.addRule(SET_ID, ruleRequest("K-01")))
                .isInstanceOf(BadRequestException.class);

        verify(ruleRepository, never()).saveAndFlush(any());
    }

    // --- правила ------------------------------------------------------------

    /**
     * Правило ищется В ПРЕДЕЛАХ набора: иначе владелец одного набора правил
     * менял бы записи другого, зная только их id.
     */
    @Test
    void ruleFromAnotherSetIsNotEditable() throws Exception {
        stubCurrentUser("user-owner", "owner@test.com");
        when(ruleSetRepository.findById(SET_ID)).thenReturn(Optional.of(userSet(owner)));
        when(ruleRepository.findByIdAndRuleSetId("rule-of-other-set", SET_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.updateRule(SET_ID, "rule-of-other-set", ruleRequest("K-01")))
                .isInstanceOf(NotFoundException.class);

        verify(ruleRepository, never()).saveAndFlush(any());
    }

    @Test
    void duplicateCodeInSetIsRejectedWithReadableMessage() throws Exception {
        stubCurrentUser("user-owner", "owner@test.com");
        when(ruleSetRepository.findById(SET_ID)).thenReturn(Optional.of(userSet(owner)));
        when(ruleRepository.existsByRuleSetIdAndCode(SET_ID, "K-01")).thenReturn(true);

        assertThatThrownBy(() -> service.addRule(SET_ID, ruleRequest("K-01")))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("уже есть в этом наборе");

        verify(ruleRepository, never()).saveAndFlush(any());
    }

    /** Правка формулировки не должна спотыкаться о собственный код правила. */
    @Test
    void updateKeepingOwnCodeIsNotADuplicate() throws Exception {
        stubCurrentUser("user-owner", "owner@test.com");
        RuleSet set = userSet(owner);
        Rule existing = rule(set, "K-01", RuleLevel.CORE, false);
        when(ruleSetRepository.findById(SET_ID)).thenReturn(Optional.of(set));
        when(ruleRepository.findByIdAndRuleSetId("r1", SET_ID)).thenReturn(Optional.of(existing));

        RuleRequestDto data = ruleRequest("K-01");
        data.setBody("Новая формулировка");
        RuleDto updated = service.updateRule(SET_ID, "r1", data);

        assertThat(updated.body()).isEqualTo("Новая формулировка");
        verify(ruleRepository, never()).existsByRuleSetIdAndCode(any(), any());
    }

    /**
     * Системное правило — часть перенесённого канона. Удалить его поштучно
     * нельзя (единица избавления — набор), а изменить формулировку можно:
     * иначе перенос в чужой проект пришлось бы делать копипастой.
     */
    @Test
    void systemRuleCannotBeDeletedOneByOne() throws Exception {
        stubCurrentUser("user-owner", "owner@test.com");
        RuleSet set = userSet(owner);
        when(ruleSetRepository.findById(SET_ID)).thenReturn(Optional.of(set));
        when(ruleRepository.findByIdAndRuleSetId("r1", SET_ID))
                .thenReturn(Optional.of(rule(set, "K-01", RuleLevel.CORE, true)));

        assertThatThrownBy(() -> service.deleteRule(SET_ID, "r1"))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("нельзя удалить по одному");

        verify(ruleRepository, never()).delete(any());
    }

    @Test
    void systemRuleIsStillEditable() throws Exception {
        stubCurrentUser("user-owner", "owner@test.com");
        RuleSet set = userSet(owner);
        when(ruleSetRepository.findById(SET_ID)).thenReturn(Optional.of(set));
        when(ruleRepository.findByIdAndRuleSetId("r1", SET_ID))
                .thenReturn(Optional.of(rule(set, "K-01", RuleLevel.CORE, true)));

        RuleRequestDto data = ruleRequest("K-01");
        data.setBody("Уточнённая формулировка");

        assertThat(service.updateRule(SET_ID, "r1", data).body()).isEqualTo("Уточнённая формулировка");
    }

    /**
     * Порядок вывода — ядро, паки, профиль; внутри уровня по коду. Проверяется
     * отдельно, потому что сортировка сделана в коде по {@code ordinal()}: имена
     * уровней сейчас случайно упорядочены и по алфавиту, и {@code ORDER BY} по
     * строковой колонке дал бы тот же результат — до первого нового уровня.
     */
    @Test
    void rulesAreOrderedByLevelThenCode() throws Exception {
        stubCurrentUser("user-owner", "owner@test.com");
        RuleSet set = userSet(owner);
        when(ruleSetRepository.findById(SET_ID)).thenReturn(Optional.of(set));
        when(ruleRepository.findByRuleSetId(SET_ID)).thenReturn(List.of(
                rule(set, "P-02", RuleLevel.PROFILE, false),
                rule(set, "W-03", RuleLevel.PACK, false),
                rule(set, "K-10", RuleLevel.CORE, false),
                rule(set, "K-02", RuleLevel.CORE, false)));

        assertThat(service.listRules(SET_ID)).extracting(RuleDto::code)
                .containsExactly("K-02", "K-10", "W-03", "P-02");
    }

    // --- I-03 ---------------------------------------------------------------

    /**
     * I-03 (ADR-027): проект без единого набора правил — нормальное состояние,
     * а не ошибка. Именно это делает откат фазы «перестать пользоваться».
     */
    @Test
    void projectWithoutRuleSetsReturnsEmptyList() throws Exception {
        when(checkerUtil.findAndCheckProjectUserData(PROJECT_ID, false, false))
                .thenReturn(new UserAndProjectData(project, member));
        when(ruleSetRepository.findByProjectIdOrderByCreatedAtAsc(PROJECT_ID)).thenReturn(List.of());

        assertThat(service.listForProject(PROJECT_ID)).isEmpty();
        verifyNoInteractions(ruleRepository);
    }

    /** Пользователь без общих наборов тоже получает пустой список, а не отказ. */
    @Test
    void userWithoutRuleSetsReturnsEmptyList() {
        stubCurrentUser("user-owner", "owner@test.com");
        when(ruleSetRepository.findByOwnerIdAndProjectIsNullOrderByCreatedAtAsc("user-owner"))
                .thenReturn(List.of());

        assertThat(service.listMy()).isEmpty();
    }

    // --- наборы -------------------------------------------------------------

    @Test
    void createForProjectRequiresProjectOwner() throws Exception {
        when(checkerUtil.findAndCheckProjectUserData(PROJECT_ID, false, false))
                .thenReturn(new UserAndProjectData(project, member));
        doThrow(new BadRequestException("Вы не являетесь руководителем проекта"))
                .when(checkerUtil).checkProjectOwner(project, member);

        RuleSetRequestDto data = new RuleSetRequestDto();
        data.setName("Правила проекта");

        assertThatThrownBy(() -> service.createForProject(PROJECT_ID, data))
                .isInstanceOf(BadRequestException.class);

        verify(ruleSetRepository, never()).saveAndFlush(any());
    }

    /** Удаление набора уносит его правила: осиротевшие правила недостижимы. */
    @Test
    void deletingSetRemovesItsRules() throws Exception {
        stubCurrentUser("user-owner", "owner@test.com");
        RuleSet set = userSet(owner);
        when(ruleSetRepository.findById(SET_ID)).thenReturn(Optional.of(set));

        service.delete(SET_ID);

        verify(ruleRepository).deleteByRuleSetId(SET_ID);
        verify(ruleSetRepository).delete(set);
    }
}
