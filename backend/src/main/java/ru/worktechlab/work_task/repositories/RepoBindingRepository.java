package ru.worktechlab.work_task.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import ru.worktechlab.work_task.models.tables.RepoBinding;

import java.util.List;
import java.util.Optional;

@Repository
public interface RepoBindingRepository extends JpaRepository<RepoBinding, String> {

    List<RepoBinding> findByProjectIdOrderByCreatedAtAsc(String projectId);

    Optional<RepoBinding> findByIdAndProjectId(String id, String projectId);

    boolean existsByProjectIdAndUrl(String projectId, String url);
}
