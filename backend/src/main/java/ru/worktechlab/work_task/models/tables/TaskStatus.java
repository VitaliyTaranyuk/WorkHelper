package ru.worktechlab.work_task.models.tables;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Getter
@NoArgsConstructor
public class TaskStatus {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private long id;
    @Column(nullable = false)
    private int priority;
    @Column(nullable = false)
    private String code;
    @Column
    private String description;
    @Column(nullable = false)
    private boolean viewed;
    @Column(nullable = false)
    private boolean defaultTaskStatus;
    /**
     * Системная (дефолтная) колонка, созданная вместе с проектом (ТП-32):
     * закреплена по порядку — переименовывать можно, переставлять/удалять нельзя.
     */
    @Column(name = "system_status", nullable = false)
    private boolean systemStatus = false;
    @ManyToOne
    @JoinColumn(nullable = false)
    private Project project;

    public TaskStatus(int priority,
                      String code,
                      String description,
                      boolean viewed,
                      boolean defaultTaskStatus,
                      Project project) {
        this.priority = priority;
        this.code = code;
        this.description = description;
        this.viewed = viewed;
        this.defaultTaskStatus = defaultTaskStatus;
        this.project = project;
    }

    public TaskStatus(int priority,
                      String code,
                      String description,
                      boolean viewed,
                      boolean defaultTaskStatus,
                      boolean systemStatus,
                      Project project) {
        this(priority, code, description, viewed, defaultTaskStatus, project);
        this.systemStatus = systemStatus;
    }

    public void setPriority(int priority) {
        this.priority = priority;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public void setViewed(boolean viewed) {
        this.viewed = viewed;
    }

    public void setDefaultTaskStatus(boolean defaultTaskStatus) {
        this.defaultTaskStatus = defaultTaskStatus;
    }
}
