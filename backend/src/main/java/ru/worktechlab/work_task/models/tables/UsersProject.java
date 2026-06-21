package ru.worktechlab.work_task.models.tables;

import jakarta.persistence.*;
import lombok.Data;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Table(name = "users_projects")
@NoArgsConstructor
public class UsersProject {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false, unique = true)
    private Integer id;

    @ManyToOne
    private User user;

    @ManyToOne
    private Project project;

    public UsersProject(User user, Project project) {
        this.user = user;
        this.project = project;
    }
}
