package ru.worktechlab.work_task.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import ru.worktechlab.work_task.models.tables.ProjectHistory;

import java.util.List;

@Repository
public interface ProjectHistoryRepository extends JpaRepository<ProjectHistory, String> {

    List<ProjectHistory> findByProjectIdOrderByCreatedAtDesc(String projectId);
}
