package ru.worktechlab.work_task.services;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import ru.worktechlab.work_task.annotations.TransactionRequired;
import ru.worktechlab.work_task.dto.UserAndProjectData;
import ru.worktechlab.work_task.dto.rules.ReferenceSetDto;
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

/**
 * T-513: импорт эталонного набора правил WorkHelper.
 *
 * <p>Импорт — это создание **обычного** набора из каталога, а не особая сущность: дальше он
 * живёт по правилам T-511 (редактируется, переносится T-512, удаляется целиком). Правила
 * получают {@code systemRule = true} — они корень канона, а не рукописная запись, и потому
 * не удаляются по одному.
 *
 * <p>{@code sourceRuleId} у импортированных правил пуст: провенанс отвечает на вопрос «из
 * какого правила скопировано», а у корня источника нет. Выдумывать ссылку на несуществующую
 * запись было бы хуже пустоты.
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class ReferenceRuleImportService {

    private final ReferenceRuleCatalog catalog;
    private final RuleSetRepository ruleSetRepository;
    private final RuleRepository ruleRepository;
    private final CheckerUtil checkerUtil;
    private final UserContext userContext;

    public List<ReferenceSetDto> available() {
        return catalog.sets().stream()
                .map(s -> new ReferenceSetDto(s.id(), s.name(), s.description(), s.rules().size()))
                .toList();
    }

    @TransactionRequired
    public RuleSetDto importIntoMy(String referenceId) throws NotFoundException, BadRequestException {
        ReferenceRuleCatalog.ReferenceSet reference = catalog.require(referenceId);
        User user = checkerUtil.findActiveUser(userContext.getUserData().getUserId());

        if (ruleSetRepository.existsByOwnerIdAndProjectIsNullAndName(user.getId(), reference.name()))
            throw alreadyImported(reference);

        return materialize(reference, user, null);
    }

    @TransactionRequired
    public RuleSetDto importIntoProject(String projectId, String referenceId)
            throws NotFoundException, BadRequestException {
        ReferenceRuleCatalog.ReferenceSet reference = catalog.require(referenceId);
        UserAndProjectData ctx = checkerUtil.findAndCheckProjectUserData(projectId, false, false);
        // Наполнение проекта правилами — изменение проекта, поэтому владелец,
        // как и в остальных операциях записи над проектным набором (T-511).
        checkerUtil.checkProjectOwner(ctx.getProject(), ctx.getUser());

        if (ruleSetRepository.existsByProjectIdAndName(projectId, reference.name()))
            throw alreadyImported(reference);

        return materialize(reference, ctx.getUser(), ctx.getProject());
    }

    /**
     * Повторный импорт того же набора отвергается по имени. Отдельного поля «откуда
     * импортирован» в модели нет и заводить его ради этой проверки не стали: имя — и есть
     * то, чем набор опознаёт пользователь, а два одинаковых «Ядра WorkHelper» рядом были бы
     * не двумя объектами, а ошибкой ввода (**K-34** — сообщение объясняет, что делать).
     */
    private static BadRequestException alreadyImported(ReferenceRuleCatalog.ReferenceSet reference) {
        return new BadRequestException(String.format(
                "Набор «%s» уже импортирован. Удалите существующий, если хотите импортировать заново",
                reference.name()));
    }

    private RuleSetDto materialize(ReferenceRuleCatalog.ReferenceSet reference, User owner, Project project) {
        RuleSet set = new RuleSet(owner, project, reference.name(), reference.description());
        ruleSetRepository.saveAndFlush(set);

        List<Rule> rules = reference.rules().stream()
                .map(r -> new Rule(set, r.code(), r.level(), r.kind(), r.strength(),
                        r.triggerCondition(), r.verification(), r.body(), null, true))
                .toList();
        ruleRepository.saveAllAndFlush(rules);

        log.info("Reference rule set imported: id={} rules={} project={}",
                reference.id(), rules.size(), project == null ? "-" : project.getId());

        return new RuleSetDto(set.getId(), project == null ? null : project.getId(),
                set.getName(), set.getDescription(), set.getVersion(), rules.size(), set.getCreatedAt());
    }
}
