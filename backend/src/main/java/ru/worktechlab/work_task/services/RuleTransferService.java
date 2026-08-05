package ru.worktechlab.work_task.services;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import ru.worktechlab.work_task.annotations.TransactionMandatory;
import ru.worktechlab.work_task.exceptions.NotFoundException;
import ru.worktechlab.work_task.models.tables.Project;
import ru.worktechlab.work_task.models.tables.Rule;
import ru.worktechlab.work_task.models.tables.RuleSet;
import ru.worktechlab.work_task.models.tables.User;
import ru.worktechlab.work_task.repositories.RuleRepository;
import ru.worktechlab.work_task.repositories.RuleSetRepository;
import ru.worktechlab.work_task.utils.CheckerUtil;

import java.util.ArrayList;
import java.util.List;

/**
 * T-512 (ADR-019): перенос правил в создаваемый проект.
 *
 * <p>Не новая парадигма, а ещё один шаг наполнения нового проекта рядом с
 * {@code createDefaultStatuses} и {@code createDefaultSprint} — механизм уже
 * существует и работает, заводить второй было бы новизной ради новизны
 * (**K-38**).
 *
 * <p>Отдельный сервис, а не метод {@code RuleSetService}: у переноса другая
 * модель доступа. {@code RuleSetService} отвечает на вопрос «кому можно трогать
 * этот набор», здесь же вопрос один — «есть ли у создателя доступ к донору», и
 * смешивать их значило бы получить метод с двумя разными правилами доступа
 * внутри.
 *
 * <p><b>Копия независима от источника.</b> Создаются новые записи, а не ссылки:
 * правки в доноре в скопированный набор не текут. Происхождение хранится в
 * {@code rule.source_rule_id}, а {@code rule_set.version} позволяет обновиться
 * осознанно — это и есть требование провенанса из ADR-019.
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class RuleTransferService {

    private final RuleSetRepository ruleSetRepository;
    private final RuleRepository ruleRepository;
    private final CheckerUtil checkerUtil;

    /**
     * Перенести правила в только что созданный проект.
     *
     * <p>Переносятся общие наборы создателя (наборы без проекта) и, если донор
     * указан, наборы проекта-донора. У пользователя без общих наборов и без
     * донора не создаётся ни одной записи — проект работает ровно как раньше
     * (инвариант I-03), и именно это делает шаг безопасным на критичном пути
     * создания проекта.
     *
     * @param donorProjectId необязательный проект-донор; {@code null} или пустая
     *                       строка означают «не копировать»
     * @return сколько наборов скопировано
     */
    @TransactionMandatory
    public int copyIntoNewProject(Project target, User creator, String donorProjectId)
            throws NotFoundException {
        List<RuleSet> sources = new ArrayList<>(
                ruleSetRepository.findByOwnerIdAndProjectIsNullOrderByCreatedAtAsc(creator.getId()));

        if (donorProjectId != null && !donorProjectId.isBlank()) {
            // Донор проверяется тем же механизмом, что и любой проектный запрос:
            // скопировать правила из проекта, к которому нет доступа, нельзя.
            // Отказ здесь обрывает создание проекта целиком — так и задумано:
            // пользователь просил перенести правила, и молча создать проект без
            // них означало бы молчаливый отказ (**W-06**).
            checkerUtil.findAndCheckProjectUserData(donorProjectId, false, false);
            sources.addAll(ruleSetRepository.findByProjectIdOrderByCreatedAtAsc(donorProjectId));
        }

        sources.forEach(source -> copySet(source, target, creator));
        if (!sources.isEmpty())
            log.info("Rule sets copied into project {}: {}", target.getId(), sources.size());
        return sources.size();
    }

    private void copySet(RuleSet source, Project target, User creator) {
        RuleSet copy = new RuleSet(creator, target, source.getName(), source.getDescription());
        ruleSetRepository.saveAndFlush(copy);

        List<Rule> rules = ruleRepository.findByRuleSetId(source.getId()).stream()
                .map(r -> new Rule(copy, r.getCode(), r.getLevel(), r.getKind(), r.getStrength(),
                        r.getTriggerCondition(), r.getVerification(), r.getBody(),
                        // Провенанс указывает на НЕПОСРЕДСТВЕННЫЙ источник, а не
                        // на корень цепочки копий: «из какого правила скопировано»
                        // — это ответ про один шаг. Внешнего ключа здесь нет
                        // намеренно (T-511): источник могут удалить, а
                        // происхождение обязано пережить удаление.
                        r.getId(),
                        // Закреплённость переносится как есть: правило, закреплённое
                        // в источнике, остаётся закреплённым в копии, а заведённое
                        // руками — свободно удаляемым. Иначе перенос менял бы
                        // смысл переносимого.
                        r.isSystemRule()))
                .toList();

        if (!rules.isEmpty())
            ruleRepository.saveAllAndFlush(rules);
    }
}
