package ru.worktechlab.work_task.services;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import ru.worktechlab.work_task.annotations.TransactionRequired;
import ru.worktechlab.work_task.dto.ApiResponse;
import ru.worktechlab.work_task.dto.UserAndProjectData;
import ru.worktechlab.work_task.dto.rules.RuleDto;
import ru.worktechlab.work_task.dto.rules.RuleRequestDto;
import ru.worktechlab.work_task.dto.rules.RuleSetDto;
import ru.worktechlab.work_task.dto.rules.RuleSetRequestDto;
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

import java.util.Comparator;
import java.util.List;
import java.util.Objects;

/**
 * T-511: правила как данные.
 *
 * <p>Доступ решается здесь, а не в валидаторе (**W-04**), и у набора он зависит
 * от уровня (ADR-018):
 *
 * <ul>
 *   <li><b>набор проекта</b> — читает любой участник (иначе он не увидел бы, по
 *       каким правилам работает его же проект), меняет только владелец проекта:
 *       ровно как у колонок доски и привязок репозитория;</li>
 *   <li><b>набор пользователя</b> ({@code project == null}) — и читает, и меняет
 *       только его владелец.</li>
 * </ul>
 *
 * <p>Чужой пользовательский набор даёт «не найдено», а не «нет прав»: ответ «нет
 * прав» подтвердил бы существование записи, которую спрашивающий видеть не должен.
 *
 * <p>Набор **необязателен**: проект без единой записи работает как раньше (I-03).
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class RuleSetService {

    private final RuleSetRepository ruleSetRepository;
    private final RuleRepository ruleRepository;
    private final CheckerUtil checkerUtil;
    private final UserContext userContext;

    // --- наборы -------------------------------------------------------------

    /** Общие правила пользователя — наборы без проекта. */
    @TransactionRequired
    public List<RuleSetDto> listMy() {
        String userId = userContext.getUserData().getUserId();
        return ruleSetRepository.findByOwnerIdAndProjectIsNullOrderByCreatedAtAsc(userId).stream()
                .map(this::toDto)
                .toList();
    }

    @TransactionRequired
    public List<RuleSetDto> listForProject(String projectId) throws NotFoundException {
        checkerUtil.findAndCheckProjectUserData(projectId, false, false);
        return ruleSetRepository.findByProjectIdOrderByCreatedAtAsc(projectId).stream()
                .map(this::toDto)
                .toList();
    }

    @TransactionRequired
    public RuleSetDto createMy(RuleSetRequestDto data) {
        User user = checkerUtil.findActiveUser(userContext.getUserData().getUserId());
        RuleSet set = new RuleSet(user, null, data.getName().trim(), trimmedDescription(data));
        ruleSetRepository.saveAndFlush(set);
        log.info("Rule set created: owner={} scope=user", user.getId());
        return toDto(set);
    }

    @TransactionRequired
    public RuleSetDto createForProject(String projectId, RuleSetRequestDto data)
            throws NotFoundException, BadRequestException {
        UserAndProjectData ctx = checkerUtil.findAndCheckProjectUserData(projectId, false, false);
        checkerUtil.checkProjectOwner(ctx.getProject(), ctx.getUser());

        RuleSet set = new RuleSet(ctx.getUser(), ctx.getProject(), data.getName().trim(), trimmedDescription(data));
        ruleSetRepository.saveAndFlush(set);
        log.info("Rule set created: project={}", projectId);
        return toDto(set);
    }

    @TransactionRequired
    public RuleSetDto update(String ruleSetId, RuleSetRequestDto data)
            throws NotFoundException, BadRequestException {
        RuleSet set = findAccessible(ruleSetId, true);
        set.update(data.getName().trim(), trimmedDescription(data));
        ruleSetRepository.saveAndFlush(set);
        return toDto(set);
    }

    @TransactionRequired
    public ApiResponse delete(String ruleSetId) throws NotFoundException, BadRequestException {
        RuleSet set = findAccessible(ruleSetId, true);
        // Правила удаляются явно, а не только каскадом БД: каскад сработал бы и
        // так, но тогда поведение зависело бы от схемы, а не от кода — и тест
        // на моках ничего бы не проверял.
        ruleRepository.deleteByRuleSetId(ruleSetId);
        ruleSetRepository.delete(set);
        ruleSetRepository.flush();
        log.info("Rule set deleted: id={}", ruleSetId);
        return new ApiResponse("Набор правил удалён");
    }

    // --- правила ------------------------------------------------------------

    @TransactionRequired
    public List<RuleDto> listRules(String ruleSetId) throws NotFoundException, BadRequestException {
        findAccessible(ruleSetId, false);
        return sorted(ruleRepository.findByRuleSetId(ruleSetId)).stream()
                .map(RuleSetService::toDto)
                .toList();
    }

    @TransactionRequired
    public RuleDto addRule(String ruleSetId, RuleRequestDto data)
            throws NotFoundException, BadRequestException {
        RuleSet set = findAccessible(ruleSetId, true);
        String code = data.getCode().trim();
        // Один код в наборе — одно правило. Иначе экспорт (T-514) выдал бы два
        // разных требования под одним идентификатором, а это ровно та ошибка,
        // которую в файлах закрывали T-106/T-107.
        if (ruleRepository.existsByRuleSetIdAndCode(ruleSetId, code))
            throw new BadRequestException(String.format("Правило %s уже есть в этом наборе", code));

        Rule rule = new Rule(set, code, data.getLevel(), data.getKind(), data.getStrength(),
                data.getTriggerCondition().trim(), data.getVerification(), data.getBody().trim(),
                null, false);
        ruleRepository.saveAndFlush(rule);
        return toDto(rule);
    }

    @TransactionRequired
    public RuleDto updateRule(String ruleSetId, String ruleId, RuleRequestDto data)
            throws NotFoundException, BadRequestException {
        findAccessible(ruleSetId, true);
        Rule rule = findInSet(ruleSetId, ruleId);

        String code = data.getCode().trim();
        if (!rule.getCode().equals(code) && ruleRepository.existsByRuleSetIdAndCode(ruleSetId, code))
            throw new BadRequestException(String.format("Правило %s уже есть в этом наборе", code));

        // Системное правило редактируется: перенесённая формулировка должна
        // подстраиваться под проект, иначе набор пришлось бы дублировать целиком
        // ради одной правки.
        rule.update(code, data.getLevel(), data.getKind(), data.getStrength(),
                data.getTriggerCondition().trim(), data.getVerification(), data.getBody().trim());
        ruleRepository.saveAndFlush(rule);
        return toDto(rule);
    }

    @TransactionRequired
    public ApiResponse deleteRule(String ruleSetId, String ruleId)
            throws NotFoundException, BadRequestException {
        findAccessible(ruleSetId, true);
        Rule rule = findInSet(ruleSetId, ruleId);
        if (rule.isSystemRule())
            throw new BadRequestException(
                    "Правило из стандартного набора нельзя удалить по одному — можно изменить его "
                            + "формулировку или удалить набор целиком");

        ruleRepository.delete(rule);
        ruleRepository.flush();
        return new ApiResponse("Правило удалено");
    }

    // --- доступ и вспомогательное -------------------------------------------

    /**
     * Единственная точка решения о доступе к набору. Проектный набор проверяется
     * тем же {@code CheckerUtil}, что и все остальные проектные запросы;
     * пользовательский — сверкой владельца.
     *
     * @param forWrite изменение проектного набора доступно только владельцу проекта
     */
    private RuleSet findAccessible(String ruleSetId, boolean forWrite)
            throws NotFoundException, BadRequestException {
        RuleSet set = ruleSetRepository.findById(ruleSetId).orElseThrow(
                () -> new NotFoundException(String.format("Набор правил %s не найден", ruleSetId)));

        Project project = set.getProject();
        if (project == null) {
            String userId = userContext.getUserData().getUserId();
            if (!Objects.equals(set.getOwner().getId(), userId))
                throw new NotFoundException(String.format("Набор правил %s не найден", ruleSetId));
            return set;
        }

        UserAndProjectData ctx = checkerUtil.findAndCheckProjectUserData(project.getId(), false, false);
        if (forWrite)
            checkerUtil.checkProjectOwner(ctx.getProject(), ctx.getUser());
        return set;
    }

    private Rule findInSet(String ruleSetId, String ruleId) throws NotFoundException {
        return ruleRepository.findByIdAndRuleSetId(ruleId, ruleSetId).orElseThrow(
                () -> new NotFoundException(String.format("Правило %s не найдено в наборе", ruleId)));
    }

    /**
     * Порядок показа и выгрузки: сначала ядро, затем паки, затем профиль; внутри
     * уровня — по коду. Сортировка идёт в коде по {@code ordinal()}, а не
     * {@code ORDER BY} по строковой колонке: сейчас имена уровней случайно
     * упорядочены и по алфавиту, но опираться на совпадение нельзя — новое имя
     * уровня молча переставило бы весь вывод.
     */
    private static List<Rule> sorted(List<Rule> rules) {
        return rules.stream()
                .sorted(Comparator.comparingInt((Rule r) -> r.getLevel().ordinal())
                        .thenComparing(Rule::getCode))
                .toList();
    }

    private static String trimmedDescription(RuleSetRequestDto data) {
        return data.getDescription() == null ? null : data.getDescription().trim();
    }

    private RuleSetDto toDto(RuleSet set) {
        return new RuleSetDto(set.getId(),
                set.getProject() == null ? null : set.getProject().getId(),
                set.getName(), set.getDescription(), set.getVersion(),
                ruleRepository.countByRuleSetId(set.getId()), set.getCreatedAt());
    }

    private static RuleDto toDto(Rule r) {
        return new RuleDto(r.getId(), r.getCode(), r.getLevel().name(), r.getKind().name(),
                r.getStrength().name(), r.getTriggerCondition(), r.getVerification().name(),
                r.getBody(), r.getSourceRuleId(), r.isSystemRule());
    }
}
