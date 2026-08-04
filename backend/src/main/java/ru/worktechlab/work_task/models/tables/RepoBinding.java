package ru.worktechlab.work_task.models.tables;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * T-510 (ADR-020): привязка проекта к репозиторию.
 *
 * <p>Отдельная сущность, а не колонки в {@link Project}: WorkHelper сам монорепо
 * (backend + frontend), и проект может быть связан с несколькими репозиториями.
 * Это следует уже существующему паттерну «набор, принадлежащий проекту» —
 * {@code TaskStatus} и {@code Sprint} тоже отдельные таблицы с FK на проект.
 *
 * <p>Привязка **необязательна**: проект без единой записи работает ровно как
 * раньше (инвариант I-03 фазы 5). Это не удобство, а условие, при котором фаза
 * откатывается простым «перестать пользоваться» (ADR-027).
 */
@Getter
@Entity
@Table(name = "repo_binding")
@NoArgsConstructor
public class RepoBinding {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "project_id", nullable = false)
    private Project project;

    /** {@code github} | {@code gitlab} | … — строка, а не enum: провайдеров добавляют без миграции. */
    @Column(nullable = false, length = 32)
    private String provider;

    @Column(nullable = false, length = 512)
    private String url;

    @Column(name = "default_branch", nullable = false)
    private String defaultBranch;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    public RepoBinding(Project project, String provider, String url, String defaultBranch) {
        this.project = project;
        this.provider = provider;
        this.url = url;
        this.defaultBranch = defaultBranch;
        this.createdAt = LocalDateTime.now();
    }

    public void update(String provider, String url, String defaultBranch) {
        this.provider = provider;
        this.url = url;
        this.defaultBranch = defaultBranch;
    }
}
