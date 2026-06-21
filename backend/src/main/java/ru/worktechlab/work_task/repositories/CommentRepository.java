package ru.worktechlab.work_task.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import ru.worktechlab.work_task.models.tables.Comment;

import java.util.List;
import java.util.Optional;

@Repository
public interface CommentRepository extends JpaRepository<Comment, String> {
    Optional<Comment> findById(String id);

    @Query("FROM Comment c WHERE c.id = :id AND c.task.id = :taskId")
    Optional<Comment> findByCommentAndTaskAds(String id, String taskId);

    @Query(nativeQuery = true,
            value = "select * from comment where id = :id AND c.task.id = :taskId for update skip locked")
    Optional<Comment> findCommentByIdForUpdate(String id, String taskId);

    @Modifying
    @Query(nativeQuery = true,
            value = "delete from comment where id = :id")
    void deleteCommentById(String id);

    List<Comment> findAllByTaskIdOrderByCreatedAtAsc(String taskId);
}
