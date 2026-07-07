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

    /** Минимальная позиция карточки в колонке — для вставки новой задачи в самый верх (ТП-36). */
    @Query("select min(t.position) from TaskModel t where t.project = :project and t.status = :status and t.archived = false")
    Integer findMinPositionByProjectAndStatus(Project project, TaskStatus status);

    /**
     * ТП-188: серверный поиск по ВСЕМ задачам проекта (активный/неактивные
     * спринты, Backlog, завершённые, архив). Регистронезависимо, частичное
     * совпадение по коду, названию и ОПИСАНИЮ (тело описания в списковых
     * выдачах не передаётся — ТП-187, поэтому поиск по описанию возможен
     * только здесь). Возвращаем только id — фронт подсвечивает совпадения в
     * уже загруженном сгруппированном списке, не таская тела описаний.
     */
    @Query("select t.id from TaskModel t where t.project = :project and (" +
            "lower(t.code) like lower(concat('%', :q, '%')) or " +
            "lower(t.title) like lower(concat('%', :q, '%')) or " +
            "lower(t.description) like lower(concat('%', :q, '%')))")
    List<String> searchTaskIds(Project project, String q);
}


