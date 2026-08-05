package ru.worktechlab.work_task.models.tables;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import ru.worktechlab.work_task.models.enums.TaskSize;

/**
 * T-515 (ADR-021): этап процесса задачи.
 *
 * <p>Принадлежит проекту и переносится вместе с правилами: процесс — такая же переносимая
 * часть метода работы, как правила, и держать его отдельным механизмом означало бы два
 * способа переноса одного и того же.
 *
 * <p>Этапы **необязательны**: проект без единой записи здесь работает ровно как раньше
 * (инвариант I-03). Связь задачи с этапом вводится отдельным шагом после бэкофилла
 * (`PHASE5_INVARIANTS §4`, п. 5) — 184 существующие задачи не обязаны иметь этап.
 */
@Getter
@Entity
@Table(name = "process_step")
@NoArgsConstructor
public class ProcessStep {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "project_id", nullable = false)
    private Project project;

    /** Короткий идентификатор этапа: {@code A0}, {@code A1}, {@code D}… */
    @Column(nullable = false, length = 16)
    private String code;

    @Column(nullable = false, length = 128)
    private String name;

    @Column(length = 512)
    private String description;

    /** Порядок в процессе. Уникален в пределах проекта — два этапа не могут быть одним. */
    @Column(name = "position", nullable = false)
    private int position;

    /**
     * T-516: с какого размера задачи этап обязателен. {@code null} — этап необязателен ни
     * при каком размере: дефолт выбран так, чтобы уже существующие этапы не стали
     * обязательными задним числом.
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "required_from_size", length = 8)
    private TaskSize requiredFromSize;

    public ProcessStep(Project project, String code, String name, String description, int position) {
        this(project, code, name, description, position, null);
    }

    public ProcessStep(Project project, String code, String name, String description, int position,
                       TaskSize requiredFromSize) {
        this.project = project;
        this.code = code;
        this.name = name;
        this.description = description;
        this.position = position;
        this.requiredFromSize = requiredFromSize;
    }

    public void update(String code, String name, String description, TaskSize requiredFromSize) {
        this.code = code;
        this.name = name;
        this.description = description;
        this.requiredFromSize = requiredFromSize;
    }

    /** Обязателен ли этап для задачи такого размера (T-516). */
    public boolean isRequiredFor(TaskSize size) {
        return requiredFromSize != null && size != null && size.atLeast(requiredFromSize);
    }

    public void moveTo(int position) {
        this.position = position;
    }
}
