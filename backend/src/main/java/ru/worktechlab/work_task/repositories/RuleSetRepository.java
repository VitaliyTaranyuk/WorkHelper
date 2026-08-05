package ru.worktechlab.work_task.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import ru.worktechlab.work_task.models.tables.RuleSet;

import java.util.List;

@Repository
public interface RuleSetRepository extends JpaRepository<RuleSet, String> {

    /**
     * Наборы уровня пользователя — те, у которых проекта нет (ADR-018).
     * Проектные наборы сюда попадать не должны, иначе «общие правила» показывали
     * бы чужой проектный набор.
     */
    List<RuleSet> findByOwnerIdAndProjectIsNullOrderByCreatedAtAsc(String ownerId);

    List<RuleSet> findByProjectIdOrderByCreatedAtAsc(String projectId);
}
