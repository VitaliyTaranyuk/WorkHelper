package ru.worktechlab.work_task.models.tables;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "project_history")
@Getter
@NoArgsConstructor
public class ProjectHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(name = "project_id", nullable = false)
    private String projectId;

    @Column(name = "change_type", nullable = false)
    private String changeType;

    @Column(name = "old_value")
    private String oldValue;

    @Column(name = "new_value")
    private String newValue;

    @ManyToOne
    @JoinColumn(name = "user_id")
    private User user;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    public ProjectHistory(String projectId, String changeType, String oldValue, String newValue, User user) {
        this.projectId = projectId;
        this.changeType = changeType;
        this.oldValue = oldValue;
        this.newValue = newValue;
        this.user = user;
        this.createdAt = LocalDateTime.now();
    }
}
