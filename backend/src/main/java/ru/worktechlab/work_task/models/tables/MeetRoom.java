package ru.worktechlab.work_task.models.tables;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Комната видеовстречи WorkTask Meet (ТП-161, .ai/MEET_ARCHITECTURE.md).
 * Долгоживущая ссылка /meet/{token} в рамках проекта; meetingId/taskId —
 * необязательный контекст (комната переживает их удаление). Токен —
 * неугадываемый (SecureRandom 32 байта base64url), не последовательный ID.
 */
@Entity
@Table(name = "meet_room")
@Getter
@NoArgsConstructor
public class MeetRoom {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false, unique = true, length = 64)
    private String token;

    @ManyToOne
    @JoinColumn(name = "project_id", nullable = false)
    private Project project;

    @Column(name = "meeting_id")
    private String meetingId;

    @Column(name = "task_id")
    private String taskId;

    @Column(nullable = false)
    private String title;

    @ManyToOne
    @JoinColumn(name = "created_by")
    private User createdBy;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "ended_at")
    private LocalDateTime endedAt;

    public MeetRoom(Project project, String token, String title,
                    String meetingId, String taskId, User createdBy) {
        this.project = project;
        this.token = token;
        this.title = title;
        this.meetingId = meetingId;
        this.taskId = taskId;
        this.createdBy = createdBy;
        this.createdAt = LocalDateTime.now();
    }

    public void end() {
        this.endedAt = LocalDateTime.now();
    }
}
