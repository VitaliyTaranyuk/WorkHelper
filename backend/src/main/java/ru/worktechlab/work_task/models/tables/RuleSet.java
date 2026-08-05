package ru.worktechlab.work_task.models.tables;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * T-511 (ADR-018): именованный набор правил — единица переноса между проектами.
 *
 * <p>Уровень набора задаётся не отдельной сущностью, а тем, заполнен ли
 * {@link #project}: {@code null} — набор уровня пользователя («общие правила»),
 * иначе набор принадлежит проекту. Прецедент nullable-связи с проектом уже есть
 * в {@code Notification}; полиморфная связь ради двух случаев была бы дороже.
 *
 * <p>Набор **необязателен**: проект без единой записи здесь работает ровно как
 * раньше (инвариант I-03) — это условие, при котором фаза 5 откатывается простым
 * «перестать пользоваться» (ADR-027).
 */
@Getter
@Entity
@Table(name = "rule_set")
@NoArgsConstructor
public class RuleSet {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    /**
     * Владелец набора. Заполнен всегда, в том числе у проектного набора: даже
     * когда доступ решает членство в проекте, у записи должен быть автор.
     */
    @ManyToOne(optional = false)
    @JoinColumn(name = "owner_user_id", nullable = false)
    private User owner;

    /** {@code null} = общие правила пользователя; иначе — правила проекта (ADR-018). */
    @ManyToOne
    @JoinColumn(name = "project_id")
    private Project project;

    @Column(nullable = false, length = 128)
    private String name;

    @Column(length = 512)
    private String description;

    /**
     * Версия набора (ADR-019): позволяет осознанно обновить скопированный набор,
     * не связывая копию с источником. Копия независима — правки в доноре в неё
     * не текут.
     */
    @Column(name = "version", nullable = false)
    private int version;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    public RuleSet(User owner, Project project, String name, String description) {
        this.owner = owner;
        this.project = project;
        this.name = name;
        this.description = description;
        this.version = 1;
        this.createdAt = LocalDateTime.now();
    }

    public void update(String name, String description) {
        this.name = name;
        this.description = description;
    }

    /** Уровень пользователя — набор без проекта. */
    public boolean isUserLevel() {
        return project == null;
    }
}
