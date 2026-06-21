package ru.worktechlab.work_task.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import ru.worktechlab.work_task.models.tables.Notification;

import java.util.List;
import java.util.Optional;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, String> {

    List<Notification> findByRecipientIdOrderByCreatedAtDesc(String recipientId);

    long countByRecipientIdAndReadFalse(String recipientId);

    Optional<Notification> findByIdAndRecipientId(String id, String recipientId);

    @Modifying
    @Query("update Notification n set n.read = true where n.recipient.id = :recipientId and n.read = false")
    void markAllRead(String recipientId);
}
