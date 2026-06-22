package ru.worktechlab.work_task.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import ru.worktechlab.work_task.models.tables.Project;
import ru.worktechlab.work_task.models.tables.Sprint;
import ru.worktechlab.work_task.models.tables.TaskModel;
import ru.worktechlab.work_task.models.tables.TaskStatus;

import java.util.List;
import java.util.Optional;

@Repository
public interface TaskRepository extends JpaRepository<TaskModel, String>, TaskFilter {

    @Query("from TaskModel where id = :taskId and project = :project")
    Optional<TaskModel> findTaskModelByIdAndProject(String taskId, Project project);

    @Query("from TaskModel where sprint = :sprint")
    List<TaskModel> findAllBySprint(Sprint sprint);

    @Query("from TaskModel where status = :status")
    List<TaskModel> findAllByStatus(TaskStatus status);

    @Query(nativeQuery = true,
            value = "select * from task_model tm where tm.project_id = :projectId and tm.id = :taskId for update skip locked")
    Optional<TaskModel> findTaskModelByIdAndProjectForUpdate(String taskId, String projectId);

    @Query("from TaskModel where code = :code and project = :project")
    Optional<TaskModel> findByCodeAndProject(String code, Project project);
}


