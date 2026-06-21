package ru.worktechlab.work_task.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.transaction.annotation.Transactional;
import ru.worktechlab.work_task.models.tables.Project;
import ru.worktechlab.work_task.models.tables.TaskStatus;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Transactional
public interface TaskStatusRepository extends JpaRepository<TaskStatus, Long> {

    @Query("from TaskStatus ps where ps.project = :project")
    List<TaskStatus> findStatusesByProject(Project project);

    @Query(nativeQuery = true,
            value = "select * from task_status ts where ts.project_id = :projectId and ts.id = :statusId for update skip locked")
    Optional<TaskStatus> findStatusByProjectAndIdForUpdate(String projectId, long statusId);

    @Query(
            "from TaskStatus where project = :project and id not in :taskStatusIds"
    )
    List<TaskStatus> findByProjectAndIdsNotIn(Project project, Collection<Long> taskStatusIds);

    @Query(
            "from TaskStatus where project = :project and id = :statusId"
    )
    Optional<TaskStatus> findStatusByProjectAndId(Project project, long statusId);
}
