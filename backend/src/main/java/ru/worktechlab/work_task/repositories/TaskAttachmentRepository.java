package ru.worktechlab.work_task.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import ru.worktechlab.work_task.models.tables.TaskAttachment;

import java.util.List;

@Repository
public interface TaskAttachmentRepository extends JpaRepository<TaskAttachment, String> {
    List<TaskAttachment> findByTaskIdOrderByUploadedAtDesc(String taskId);
}
