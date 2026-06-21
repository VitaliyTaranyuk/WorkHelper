package ru.worktechlab.work_task.models.tables;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;
import ru.worktechlab.work_task.dto.task_history.TaskHistoryDto;
import ru.worktechlab.work_task.utils.TaskChangeDetector;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Getter
@Entity
@Table(name = "task_model")
@NoArgsConstructor
public class TaskModel {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @NotBlank
    @Size(max = 255)
    @Column
    private String title;

    @Size(max = 4096)
    @Column
    private String description;

    @NotBlank
    @Column
    private String priority;

    @ManyToOne
    @JoinColumn(nullable = false, name = "creator_id")
    private User creator;

    @ManyToOne
    private User assignee;

    @ManyToOne
    @JoinColumn(nullable = false, name = "project_id")
    private Project project;

    @ManyToOne
    @JoinColumn(nullable = false, name = "sprint_id")
    private Sprint sprint;

    @NotBlank
    @Column(name = "task_type")
    private String taskType;

    @Column
    private Integer estimation;

    @ManyToOne
    @JoinColumn(nullable = false, name = "status_id")
    private TaskStatus status;

    @Column
    private LocalDateTime creationDate;

    @Column
    private LocalDateTime updateDate;

    @Column
    private String code;

    @OneToMany(mappedBy = "task", cascade = CascadeType.ALL, orphanRemoval = true)
    private final List<Comment> comments = new ArrayList<>();

    @Transient
    private TaskChangeDetector taskChangeDetector = new TaskChangeDetector();

    public List<TaskHistoryDto> getChanges() {
        return taskChangeDetector.getTaskHistories();
    }

    public void setTitle(String newValue) {
        taskChangeDetector.add("Заголовок", this.title, newValue);
        this.title = newValue;
    }

    public void setPriority(String newValue) {
        taskChangeDetector.add("Приоритет", this.priority, newValue);
        this.priority = newValue;
    }

    public void setAssignee(User newValue) {
        taskChangeDetector.add("Исполнитель", this.assignee.getId(), newValue.getId());
        this.assignee = newValue;
    }

    public void setDescription(String newValue) {
        taskChangeDetector.add("Описание", this.description, newValue);
        this.description = newValue;
    }

    public void setSprint(Sprint newValue) {
        taskChangeDetector.add("Идентификатор спринта", this.sprint.getId(), newValue.getId());
        this.sprint = newValue;
    }

    public void setTaskType(String newValue) {
        taskChangeDetector.add("Тип задачи", this.taskType, newValue);
        this.taskType = newValue;
    }

    public void setEstimation(Integer newValue) {
        taskChangeDetector.add("Оценка задачи", String.valueOf(this.estimation), String.valueOf(newValue));
        this.estimation = newValue;
    }

    public void setStatus(TaskStatus newValue) {
        taskChangeDetector.add("Статус задачи", this.status.getCode(), newValue.getCode());
        this.status = newValue;
    }

    public TaskModel(String title,
                     String description,
                     String priority,
                     User creator,
                     User assignee,
                     Project project,
                     Sprint sprint,
                     String taskType,
                     Integer estimation,
                     TaskStatus status,
                     String code) {
        this.title = title;
        this.description = description;
        this.priority = priority;
        this.creator = creator;
        this.assignee = assignee;
        this.project = project;
        this.sprint = sprint;
        this.taskType = taskType;
        this.estimation = estimation;
        this.status = status;
        this.code = code;
        LocalDateTime date = LocalDateTime.now();
        this.creationDate = date;
        this.updateDate = date;
    }
}
