package ru.worktechlab.work_task.models.tables;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import ru.worktechlab.work_task.models.enums.Roles;

@Entity
@Table(name = "role")
@NoArgsConstructor
@Getter
public class RoleModel {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column
    private boolean isActive;

    @Enumerated(EnumType.STRING)
    private Roles name;

    public String getRoleName() {
        return name.name();
    }

    public String getRoleDescription() {
        return name.getDescription();
    }
}
