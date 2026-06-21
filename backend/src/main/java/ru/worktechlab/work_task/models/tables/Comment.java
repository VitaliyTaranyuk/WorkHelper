package ru.worktechlab.work_task.models.tables;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import ru.worktechlab.work_task.dto.task_history.TaskHistoryDto;
import ru.worktechlab.work_task.utils.TaskChangeDetector;

import java.time.LocalDateTime;
import java.util.List;

@Setter
@Getter
@Entity
@Table(name = "comment")
public class Comment {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", nullable = false, unique = true)
    private String id;

    @ManyToOne
    @JoinColumn(name = "task_id", referencedColumnName = "id")
    private TaskModel task;

    @ManyToOne
    @JoinColumn(name = "user_id", referencedColumnName = "id")
    private User user;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Column(name = "comment", nullable = false)
    private String comment;

    @Transient
    private TaskChangeDetector taskChangeDetector = new TaskChangeDetector();

    public List<TaskHistoryDto> getChanges() {
        return taskChangeDetector.getTaskHistories();
    }

    public void setComment(String newValue) {
        taskChangeDetector.add(this.comment, newValue);
        this.comment = newValue;
    }

    public Comment(TaskModel task, User user, String comment) {
        var date = LocalDateTime.now();
        this.task = task;
        this.user = user;
        this.comment = comment;
        this.createdAt = date;
        this.updatedAt = date;
    }

    public Comment() {
    }
}
