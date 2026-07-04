package ru.worktechlab.work_task.models.tables;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Одноразовая ссылка-приглашение в проект (ТП-35): id — сам токен (UUID),
 * ссылка действительна на одного пользователя и гасится при использовании.
 */
@Entity
@Table(name = "project_invite")
@Getter
@NoArgsConstructor
public class ProjectInvite {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @ManyToOne
    @JoinColumn(name = "project_id", nullable = false)
    private Project project;

    @ManyToOne
    @JoinColumn(name = "created_by_id", nullable = false)
    private User createdBy;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @ManyToOne
    @JoinColumn(name = "used_by_id")
    private User usedBy;

    @Column(name = "used_at")
    private LocalDateTime usedAt;

    public ProjectInvite(Project project, User createdBy) {
        this.project = project;
        this.createdBy = createdBy;
        this.createdAt = LocalDateTime.now();
    }

    public boolean isUsed() {
        return usedBy != null;
    }

    public void markUsed(User user) {
        this.usedBy = user;
        this.usedAt = LocalDateTime.now();
    }
}
