package ru.worktechlab.work_task.models.tables;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "notification")
@Getter
@NoArgsConstructor
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @ManyToOne
    @JoinColumn(name = "recipient_id", nullable = false)
    private User recipient;

    @ManyToOne
    @JoinColumn(name = "actor_id")
    private User actor;

    @Column(nullable = false)
    private String type;

    @Column(length = 1024)
    private String message;

    @Column(name = "task_id")
    private String taskId;

    @Column(name = "comment_id")
    private String commentId;

    @Column(name = "is_read", nullable = false)
    private boolean read = false;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    public Notification(User recipient, User actor, String type, String message, String taskId, String commentId) {
        this.recipient = recipient;
        this.actor = actor;
        this.type = type;
        this.message = message;
        this.taskId = taskId;
        this.commentId = commentId;
        this.read = false;
        this.createdAt = LocalDateTime.now();
    }

    public void markRead() {
        this.read = true;
    }
}
