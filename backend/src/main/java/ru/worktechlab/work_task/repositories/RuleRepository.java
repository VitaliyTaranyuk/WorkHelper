package ru.worktechlab.work_task.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import ru.worktechlab.work_task.models.tables.Rule;

import java.util.List;
import java.util.Optional;

@Repository
public interface RuleRepository extends JpaRepository<Rule, String> {

    List<Rule> findByRuleSetId(String ruleSetId);

    /**
     * Правило ищется В ПРЕДЕЛАХ набора: id из чужого набора обязан давать
     * «не найдено», а не молча редактироваться через доступный набор.
     */
    Optional<Rule> findByIdAndRuleSetId(String id, String ruleSetId);

    boolean existsByRuleSetIdAndCode(String ruleSetId, String code);

    long countByRuleSetId(String ruleSetId);

    void deleteByRuleSetId(String ruleSetId);
}
