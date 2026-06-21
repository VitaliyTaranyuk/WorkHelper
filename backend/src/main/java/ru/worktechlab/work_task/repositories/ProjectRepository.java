package ru.worktechlab.work_task.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import ru.worktechlab.work_task.models.tables.Project;

import java.util.Optional;

@Repository
public interface ProjectRepository extends JpaRepository<Project, String> {

    @Query(nativeQuery = true,
            value = "select * from project where id = :projectId for update skip locked")
    Optional<Project> findProjectByIdForUpdate(String projectId);


}