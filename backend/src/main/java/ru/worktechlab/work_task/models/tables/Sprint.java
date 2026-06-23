package ru.worktechlab.work_task.models.tables;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import ru.worktechlab.work_task.models.enums.SprintStatus;

import java.time.LocalDate;

@Entity
@Table(name = "sprint")
@Getter
@NoArgsConstructor
public class Sprint {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;
    @Column
    private String name;
    @Column
    private String goal;
    @Column
    private LocalDate startDate;
    @Column
    private LocalDate endDate;
    @Column
    private LocalDate createdAt;
    @Column
    private LocalDate finishedAt;
    @Column(name = "is_active")
    private boolean active;
    @Column(nullable = false)
    private boolean paused = false;
    @Column
    private boolean defaultSprint;
    @Column(nullable = false)
    private boolean archived = false;
    @OneToOne
    private User creator;
    @OneToOne
    private User finisher;
    @ManyToOne
    private Project project;

    public Sprint(String name, String goal, LocalDate startDate, LocalDate endDate, User creator, Project project) {
        this.name = name;
        this.goal = goal;
        this.startDate = startDate;
        this.endDate = endDate;
        this.creator = creator;
        this.project = project;
        this.active = false;
        this.createdAt = LocalDate.now();
        this.defaultSprint = false;
    }

    public Sprint(String name, User creator, Project project) {
        this.name = name;
        this.creator = creator;
        this.project = project;
        this.active = false;
        this.defaultSprint = true;
        this.createdAt = LocalDate.now();
    }

    public void setName(String name) {
        this.name = name;
    }

    public void setStartDate(LocalDate startDate) {
        this.startDate = startDate;
    }

    public void setEndDate(LocalDate endDate) {
        this.endDate = endDate;
    }

    public void activate() {
        this.active = true;
        this.paused = false;
        this.finisher = null;
        this.finishedAt = null;
    }

    public void pause() {
        this.paused = true;
    }

    public void resume() {
        this.paused = false;
    }

    public void finish(User finisher) {
        this.finisher = finisher;
        this.finishedAt = LocalDate.now();
        // Завершённый спринт перестаёт быть активным/приостановленным — иначе он
        // продолжал бы считаться текущим спринтом проекта (active=true).
        this.active = false;
        this.paused = false;
    }

    public void archive() {
        this.archived = true;
        this.active = false;
        this.paused = false;
    }

    public void restore() {
        this.archived = false;
    }

    /** Состояние спринта, выведенное из флагов (единый источник истины). */
    @Transient
    public SprintStatus getStatus() {
        if (finishedAt != null) return SprintStatus.COMPLETED;
        if (paused) return SprintStatus.PAUSED;
        if (active) return SprintStatus.ACTIVE;
        return SprintStatus.DRAFT;
    }
}
