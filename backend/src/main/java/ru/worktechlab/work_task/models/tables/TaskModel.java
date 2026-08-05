package ru.worktechlab.work_task.models.tables;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;
import ru.worktechlab.work_task.dto.task_history.TaskHistoryDto;
import ru.worktechlab.work_task.models.enums.TaskSize;
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

    // ТП-187: описание — длинный текст без искусственного потолка
    // (колонка TEXT, миграция 20260713), как в зрелых TMS.
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

    @Column(nullable = false)
    private boolean archived = false;

    @Column(name = "completed_date")
    private LocalDateTime completedDate;

    @Column(name = "position", nullable = false)
    private int position = 0;

    /**
     * T-516: размер задачи — насколько глубоко идёт разбор. Nullable: 184 существующие
     * задачи размера не имеют, и это нормальное состояние, а не незаполненное поле
     * (правило №5 `PHASE5_INVARIANTS §4`).
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "size", length = 8)
    private TaskSize size;

    /**
     * T-516: текущий этап процесса проекта. Nullable по той же причине: процесс
     * необязателен, и задача без этапа работает как раньше (I-03).
     */
    @ManyToOne
    @JoinColumn(name = "current_process_step_id")
    private ProcessStep currentProcessStep;

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
        // null-safe: задача могла быть без исполнителя (и может им стать снова)
        taskChangeDetector.add("Исполнитель",
                this.assignee != null ? this.assignee.getId() : null,
                newValue != null ? newValue.getId() : null);
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

    public void setPosition(int position) {
        this.position = position;
    }

    /**
     * T-516. **Понижение размера фиксируется** (**K-44**): протокол разрешает уменьшать
     * объём разбора, но требует записывать это. Отдельного механизма для записи не
     * заводится — понижение попадает в ту же историю задачи, что и остальные изменения,
     * и отличается формулировкой поля (**K-38**).
     */
    public void setSize(TaskSize newValue) {
        String field = TaskSize.isLowering(this.size, newValue)
                ? "Размер задачи (понижен)"
                : "Размер задачи";
        taskChangeDetector.add(field, name(this.size), name(newValue));
        this.size = newValue;
    }

    public void setCurrentProcessStep(ProcessStep newValue) {
        taskChangeDetector.add("Этап процесса",
                this.currentProcessStep != null ? this.currentProcessStep.getCode() : null,
                newValue != null ? newValue.getCode() : null);
        this.currentProcessStep = newValue;
    }

    private static String name(TaskSize size) {
        return size == null ? null : size.name();
    }

    public void setArchived(boolean archived) {
        this.archived = archived;
    }

    public void setCompletedDate(LocalDateTime completedDate) {
        this.completedDate = completedDate;
    }

    public void touch() {
        this.updateDate = LocalDateTime.now();
    }

    public void setProject(Project project) {
        this.project = project;
    }

    public void setCode(String code) {
        this.code = code;
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
