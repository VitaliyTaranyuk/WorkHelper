package ru.worktechlab.work_task.models.tables;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "task_history")
@NoArgsConstructor
@Getter
public class TaskHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false, unique = true)
    private Long id;

    @Column(name = "task_id", nullable = false)
    private String taskId;

    @OneToOne
    @JoinColumn(name = "user_id", referencedColumnName = "id")
    private User user;

    @Column(name = "field_name", nullable = false)
    private String fieldName;

    private String initialValue;

    private String newValue;

    private LocalDateTime createdAt;

    public TaskHistory(String taskId, String fieldName, String initialValue, String newValue, User user) {
        this.taskId = taskId;
        this.fieldName = fieldName;
        this.initialValue = initialValue;
        this.newValue = newValue;
        this.user = user;
        this.createdAt = LocalDateTime.now();
    }
}
