package ru.worktechlab.work_task.models.tables;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import ru.worktechlab.work_task.models.enums.LinkTypeName;

@Entity
@Table(name = "link")
@NoArgsConstructor
@Getter
public class Link {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", nullable = false, unique = true)
    private String id;

    @OneToOne
    @JoinColumn(name = "task_master_id", referencedColumnName = "id")
    private TaskModel taskMaster;

    @OneToOne
    @JoinColumn(name = "task_slave_id", referencedColumnName = "id")
    private TaskModel taskSlave;

    @Column(name = "name", nullable = false)
    @Enumerated(EnumType.STRING)
    private LinkTypeName name;

    @Column(name = "description", nullable = false)
    private String description;

    public Link(TaskModel master, TaskModel slave, LinkTypeName name) {
        this.taskMaster = master;
        this.taskSlave = slave;
        this.name = name;
        this.description = name.getDescription();
    }
}