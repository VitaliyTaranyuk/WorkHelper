package ru.worktechlab.work_task.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import ru.worktechlab.work_task.models.tables.ProcessStep;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProcessStepRepository extends JpaRepository<ProcessStep, String> {

    List<ProcessStep> findByProjectIdOrderByPositionAsc(String projectId);

    /**
     * Этап ищется В ПРЕДЕЛАХ проекта: id из чужого проекта обязан давать «не найдено»,
     * а не молча редактироваться через доступный проект.
     */
    Optional<ProcessStep> findByIdAndProjectId(String id, String projectId);

    boolean existsByProjectIdAndCode(String projectId, String code);

    boolean existsByProjectId(String projectId);
}
