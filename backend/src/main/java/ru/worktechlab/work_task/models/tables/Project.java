package ru.worktechlab.work_task.models.tables;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import ru.worktechlab.work_task.models.enums.ProjectStatus;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Getter
@Entity
@Table(name = "project")
@NoArgsConstructor
public class Project {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;
    @Column(nullable = false)
    private String name;
    @OneToOne
    private User owner;
    @Column(nullable = false)
    private LocalDate creationDate;
    @Column
    private LocalDate finishDate;
    @Column
    private LocalDate startDate;
    @Column
    private LocalDate updateDate;
    @Column
    private String description;
    @Enumerated(EnumType.STRING)
    @Column
    private ProjectStatus status;
    @OneToOne
    private User creator;
    @OneToOne
    private User finisher;
    @Column(nullable = false)
    private String code;
    @Column
    private Integer taskCounter;
    @OneToMany(mappedBy = "project")
    private final List<TaskStatus> statuses = new ArrayList<>();
    @OneToMany(mappedBy = "project")
    private final List<Sprint> sprints = new ArrayList<>();
    @OneToMany(mappedBy = "project")
    private final List<TaskModel> tasks = new ArrayList<>();
    @ManyToMany(cascade = CascadeType.MERGE)
    @JoinTable(name = "users_projects",
            joinColumns = @JoinColumn(name = "project_id"),
            inverseJoinColumns = @JoinColumn(name = "user_id"))
    private final List<User> users = new ArrayList<>();

    public Project(String name, User owner, String description, User creator, String code) {
        this.name = name;
        this.owner = owner;
        this.description = description;
        this.creator = creator;
        this.code = code;
        this.status = ProjectStatus.DRAFT;
        LocalDate date = LocalDate.now();
        this.creationDate = date;
        this.updateDate = date;
        this.taskCounter = 0;
    }

    public void finishProject(User user) {
        this.status = ProjectStatus.FINISHED;
        this.finisher = user;
        LocalDate date = LocalDate.now();
        this.updateDate = date;
        this.finishDate = date;
    }

    public void startProject() {
        this.status = ProjectStatus.ACTIVE;
        this.finishDate = null;
        this.finisher = null;
        LocalDate date = LocalDate.now();
        this.updateDate = date;
        if (this.startDate == null)
            this.startDate = date;
    }

    public void archive() {
        this.status = ProjectStatus.ARCHIVED;
        this.updateDate = LocalDate.now();
    }

    public void markDeleted() {
        this.status = ProjectStatus.DELETED;
        this.updateDate = LocalDate.now();
    }

    public void incrementCounter() {
        this.taskCounter = this.taskCounter == null ? 1 : this.taskCounter + 1;
    }

    public void setProjectOwner(User user) {
        this.owner = user;
        this.updateDate = LocalDate.now();
    }

    public void setMainData(String name,
                            String description,
                            String code) {
        this.description = description;
        this.name = name;
        this.code = code;
        this.updateDate = LocalDate.now();
    }
}
