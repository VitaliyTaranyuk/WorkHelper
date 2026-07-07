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

    @Column(name = "task_code")
    private String taskCode;

    @Column(name = "comment_id")
    private String commentId;

    @Column(name = "meeting_id")
    private String meetingId;

    @Column(name = "project_id")
    private String projectId;

    @Column(length = 2048)
    private String link;

    @Column(name = "is_read", nullable = false)
    private boolean read = false;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    public Notification(User recipient, User actor, String type, String message, String taskId, String taskCode, String commentId) {
        this.recipient = recipient;
        this.actor = actor;
        this.type = type;
        this.message = message;
        this.taskId = taskId;
        this.taskCode = taskCode;
        this.commentId = commentId;
        this.read = false;
        this.createdAt = LocalDateTime.now();
    }

    /**
     * Напоминание о встрече: link — внешняя ссылка (Телемост), при её отсутствии
     * фронтенд открывает запись встречи в календаре по meetingId/projectId.
     */
    public static Notification meetingReminder(User recipient, User actor, String type, String message,
                                               String meetingId, String projectId, String link) {
        Notification n = new Notification(recipient, actor, type, message, null, null, null);
        n.meetingId = meetingId;
        n.projectId = projectId;
        n.link = link;
        return n;
    }

    /** ТП-175: алерт мониторинга — уведомление ведёт на внешнюю карточку issue. */
    public void attachExternalLink(String link) {
        this.link = link;
    }

    public void markRead() {
        this.read = true;
    }
}
