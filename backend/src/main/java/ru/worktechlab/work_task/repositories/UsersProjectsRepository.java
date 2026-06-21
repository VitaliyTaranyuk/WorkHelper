package ru.worktechlab.work_task.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import ru.worktechlab.work_task.models.tables.UsersProject;

import java.util.Collection;
import java.util.List;

@Repository
public interface UsersProjectsRepository extends JpaRepository<UsersProject, String> {

    @Query("SELECT up.user.id FROM UsersProject up WHERE up.project.id = :projectId")
    List<String> findUserByProjectId(@Param("projectId") String projectId);

    @Modifying
    @Query(nativeQuery = true,
            value = "delete from users_projects where project_id = :projectId and user_id in :userIds")
    void deleteProjectForUsers(String projectId, Collection<String> userIds);
}
