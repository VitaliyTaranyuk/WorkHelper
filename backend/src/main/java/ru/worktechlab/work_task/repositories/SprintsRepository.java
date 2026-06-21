package ru.worktechlab.work_task.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import ru.worktechlab.work_task.models.tables.Project;
import ru.worktechlab.work_task.models.tables.Sprint;

import java.util.Optional;

@Repository
public interface SprintsRepository extends JpaRepository<Sprint, String> {

    @Query("FROM Sprint WHERE project = :project AND active = true")
    Sprint getSprintInfoByProjectId(Project project);

    @Query("SELECT s.active FROM Sprint s WHERE s.id = :id")
    Boolean isSprintActive(@Param("id") String id);

    @Query(nativeQuery = true,
            value = "select * from sprint where id = :sprintId and project_id = :projectId for update skip locked")
    Optional<Sprint> findSprintByIdForUpdate(String sprintId, String projectId);

    @Query(nativeQuery = true,
            value = "select exists (select * from sprint s where s.project_id = :projectId and s.is_active")
    boolean hasActiveSprint(String projectId);

    @Query("from Sprint where id = :sprintId and project = :project")
    Optional<Sprint> findSprintByIdAndProject(String sprintId, Project project);
}