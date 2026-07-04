package ru.worktechlab.work_task.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import ru.worktechlab.work_task.models.tables.ProjectInvite;

@Repository
public interface ProjectInviteRepository extends JpaRepository<ProjectInvite, String> {
}
